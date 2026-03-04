import { Injectable, OnModuleDestroy } from '@nestjs/common';

type CounterSeries = Map<string, number>;
type GaugeSeries = Map<string, number>;

type HistogramState = {
  buckets: number[];
  counts: number[];
  sum: number;
  count: number;
};

@Injectable()
export class MetricsService implements OnModuleDestroy {
  private readonly counters = new Map<string, CounterSeries>();
  private readonly gauges = new Map<string, GaugeSeries>();
  private readonly histograms = new Map<string, HistogramState>();
  private readonly processStart = process.hrtime.bigint();
  private readonly processCpuStart = process.cpuUsage();
  private eventLoopLagSeconds = 0;
  private readonly eventLoopTimer: NodeJS.Timeout;

  constructor() {
    this.initHistogram('ride_request_duration_ms', [25, 50, 100, 250, 500, 1000, 2500, 5000]);
    this.initHistogram('matching_duration_ms', [10, 25, 50, 100, 250, 500, 1000, 2500]);
    this.eventLoopTimer = this.startEventLoopLagProbe();
  }

  onModuleDestroy() {
    clearInterval(this.eventLoopTimer);
  }

  private startEventLoopLagProbe() {
    const intervalMs = 1000;
    let expected = Date.now() + intervalMs;
    return setInterval(() => {
      const now = Date.now();
      const lagMs = Math.max(0, now - expected);
      this.eventLoopLagSeconds = lagMs / 1000;
      expected = now + intervalMs;
    }, intervalMs);
  }

  private key(labels?: Record<string, string | number | boolean>) {
    if (!labels || !Object.keys(labels).length) return '';
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(',');
  }

  private labelsText(labelsKey: string) {
    if (!labelsKey) return '';
    const pairs = labelsKey.split(',').map((part) => {
      const [k, v] = part.split('=');
      return `${k}="${v.replace(/"/g, '\\"')}"`;
    });
    return `{${pairs.join(',')}}`;
  }

  private initHistogram(name: string, buckets: number[]) {
    this.histograms.set(name, {
      buckets,
      counts: new Array(buckets.length + 1).fill(0),
      sum: 0,
      count: 0,
    });
  }

  private incCounter(name: string, labels: Record<string, string | number | boolean>, value = 1) {
    const series = this.counters.get(name) ?? new Map<string, number>();
    const k = this.key(labels);
    series.set(k, (series.get(k) ?? 0) + value);
    this.counters.set(name, series);
  }

  private setGauge(name: string, labels: Record<string, string | number | boolean>, value: number) {
    const series = this.gauges.get(name) ?? new Map<string, number>();
    series.set(this.key(labels), value);
    this.gauges.set(name, series);
  }

  private observeHistogram(name: string, value: number) {
    const histogram = this.histograms.get(name);
    if (!histogram) return;
    histogram.sum += value;
    histogram.count += 1;
    const idx = histogram.buckets.findIndex((bucket) => value <= bucket);
    histogram.counts[idx >= 0 ? idx : histogram.buckets.length] += 1;
  }

  observeRideRequest(status: 'success' | 'fail', durationMs: number) {
    this.incCounter('ride_request_total', { status });
    this.observeHistogram('ride_request_duration_ms', durationMs);
  }

  observeMatchingDuration(durationMs: number) {
    this.observeHistogram('matching_duration_ms', durationMs);
  }

  setWsConnectedClients(value: number) {
    this.setGauge('ws_connected_clients', {}, value);
  }

  incWsSubscribeTrip(ok: boolean) {
    this.incCounter('ws_subscribe_trip_total', { ok });
  }

  setOutboxUnpublishedCount(value: number) {
    this.setGauge('outbox_unpublished_count', {}, value);
  }

  incOutboxPublish(ok: boolean) {
    this.incCounter('outbox_publish_total', { ok });
  }

  setStreamPendingCount(value: number) {
    this.setGauge('stream_pending_count', {}, value);
  }

  private renderCounter(name: string, help: string) {
    const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} counter`];
    const series = this.counters.get(name) ?? new Map<string, number>();
    for (const [labels, value] of series) {
      lines.push(`${name}${this.labelsText(labels)} ${value}`);
    }
    if (series.size === 0) lines.push(`${name} 0`);
    return lines;
  }

  private renderGauge(name: string, help: string) {
    const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} gauge`];
    const series = this.gauges.get(name) ?? new Map<string, number>();
    for (const [labels, value] of series) {
      lines.push(`${name}${this.labelsText(labels)} ${value}`);
    }
    if (series.size === 0) lines.push(`${name} 0`);
    return lines;
  }

  private renderHistogram(name: string, help: string) {
    const histogram = this.histograms.get(name);
    const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} histogram`];
    if (!histogram) {
      lines.push(`${name}_bucket{le="+Inf"} 0`);
      lines.push(`${name}_sum 0`);
      lines.push(`${name}_count 0`);
      return lines;
    }
    let cumulative = 0;
    histogram.buckets.forEach((bucket, idx) => {
      cumulative += histogram.counts[idx];
      lines.push(`${name}_bucket{le="${bucket}"} ${cumulative}`);
    });
    cumulative += histogram.counts[histogram.buckets.length];
    lines.push(`${name}_bucket{le="+Inf"} ${cumulative}`);
    lines.push(`${name}_sum ${histogram.sum}`);
    lines.push(`${name}_count ${histogram.count}`);
    return lines;
  }

  private renderProcessMetrics() {
    const lines: string[] = [];
    const mem = process.memoryUsage();
    lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes');
    lines.push('# TYPE process_resident_memory_bytes gauge');
    lines.push(`process_resident_memory_bytes ${mem.rss}`);
    lines.push('# HELP process_heap_used_bytes Process heap used in bytes');
    lines.push('# TYPE process_heap_used_bytes gauge');
    lines.push(`process_heap_used_bytes ${mem.heapUsed}`);
    lines.push('# HELP process_heap_total_bytes Process heap total in bytes');
    lines.push('# TYPE process_heap_total_bytes gauge');
    lines.push(`process_heap_total_bytes ${mem.heapTotal}`);
    lines.push('# HELP process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${process.uptime()}`);

    const cpu = process.cpuUsage(this.processCpuStart);
    lines.push('# HELP process_cpu_user_seconds_total Total user CPU time in seconds');
    lines.push('# TYPE process_cpu_user_seconds_total counter');
    lines.push(`process_cpu_user_seconds_total ${cpu.user / 1_000_000}`);
    lines.push('# HELP process_cpu_system_seconds_total Total system CPU time in seconds');
    lines.push('# TYPE process_cpu_system_seconds_total counter');
    lines.push(`process_cpu_system_seconds_total ${cpu.system / 1_000_000}`);

    const elapsedSeconds = Number(process.hrtime.bigint() - this.processStart) / 1_000_000_000;
    lines.push('# HELP process_start_time_seconds Process start time from now in seconds');
    lines.push('# TYPE process_start_time_seconds gauge');
    lines.push(`process_start_time_seconds ${Math.max(0, Date.now() / 1000 - elapsedSeconds)}`);

    lines.push('# HELP nodejs_eventloop_lag_seconds Event loop lag in seconds');
    lines.push('# TYPE nodejs_eventloop_lag_seconds gauge');
    lines.push(`nodejs_eventloop_lag_seconds ${this.eventLoopLagSeconds}`);

    return lines;
  }

  getMetricsText() {
    const lines: string[] = [];
    lines.push(...this.renderProcessMetrics());
    lines.push(...this.renderCounter('ride_request_total', 'Total ride request attempts'));
    lines.push(...this.renderHistogram('ride_request_duration_ms', 'Ride request duration in milliseconds'));
    lines.push(...this.renderHistogram('matching_duration_ms', 'Matching duration in milliseconds'));
    lines.push(...this.renderGauge('ws_connected_clients', 'Connected websocket clients count'));
    lines.push(...this.renderCounter('ws_subscribe_trip_total', 'Websocket subscribeTrip attempts'));
    lines.push(...this.renderGauge('outbox_unpublished_count', 'Unpublished outbox events count'));
    lines.push(...this.renderCounter('outbox_publish_total', 'Outbox publish attempts'));
    lines.push(...this.renderGauge('stream_pending_count', 'Pending stream messages for group'));
    return `${lines.join('\n')}\n`;
  }
}
