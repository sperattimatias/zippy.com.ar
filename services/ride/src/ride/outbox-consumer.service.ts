import { randomUUID } from 'crypto';
import { hostname } from 'os';
import { Inject, Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { REDIS_CLIENT, RedisClient } from '../infra/redis/redis.types';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class OutboxConsumerService implements OnModuleInit {
  private readonly logger = new Logger(OutboxConsumerService.name);
  private readonly stream = 'stream:trip-events';
  private readonly group = 'trip-events-group';
  private readonly dlqStream = 'stream:trip-events:dlq';
  private readonly failuresHash = 'trip-events:failures';
  private readonly failureTtlSeconds = 24 * 60 * 60;
  private readonly maxRetries: number;
  private readonly consumer: string;
  private groupReady = false;

  constructor(
    @Optional() @Inject(REDIS_CLIENT) private readonly redisClient: RedisClient | null = null,
    @Optional() private readonly metrics?: MetricsService,
  ) {
    this.consumer = process.env.INSTANCE_ID ?? `${hostname()}-${randomUUID().slice(0, 8)}`;
    this.maxRetries = this.parsePositiveInt(process.env.MAX_STREAM_RETRIES, 5);
  }

  private parsePositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const normalized = Math.trunc(parsed);
    return normalized > 0 ? normalized : fallback;
  }

  async onModuleInit() {
    this.groupReady = await this.ensureGroup();
    await this.recoverPending();
  }

  private async ensureGroup() {
    const redis = this.redisClient;
    if (!redis) return false;

    try {
      await redis.xgroup('CREATE', this.stream, this.group, '0', 'MKSTREAM');
      return true;
    } catch (error) {
      const message = (error as Error).message ?? '';
      if (message.includes('BUSYGROUP')) return true;
      this.logger.warn(`stream group ensure failed: ${message}`);
      return false;
    }
  }

  private parseFields(fields: string[] | Record<string, string>) {
    if (Array.isArray(fields)) {
      const payload: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        payload[fields[i]] = fields[i + 1];
      }
      return payload;
    }
    return fields;
  }

  private async routeEvent(messageId: string, data: Record<string, string>) {
    const eventType = data.event_type ?? 'unknown';
    const aggregateId = data.aggregate_id ?? 'unknown';

    switch (eventType) {
      case 'trip.matched':
      case 'trip.created':
      case 'trip.cancelled':
        this.logger.debug(`trip-events ${eventType} aggregate_id=${aggregateId} id=${messageId}`);
        break;
      default:
        this.logger.debug(`trip-events unhandled type=${eventType} aggregate_id=${aggregateId} id=${messageId}`);
    }
  }

  private async handleFailure(messageId: string, payload: Record<string, string>, errorMessage: string) {
    const redis = this.redisClient;
    if (!redis) return;

    const retries = await redis.hincrby(this.failuresHash, messageId, 1);
    await redis.expire(this.failuresHash, this.failureTtlSeconds);

    if (retries < this.maxRetries) return;

    await redis.xadd(
      this.dlqStream,
      '*',
      'original_id',
      messageId,
      'error_message',
      errorMessage,
      'event_type',
      payload.event_type ?? 'unknown',
      'payload',
      payload.payload ?? '',
    );
    await redis.xack(this.stream, this.group, messageId);
    await redis.hdel(this.failuresHash, messageId);
  }

  private async consumeEntries(entries: Array<[string, string[] | Record<string, string>]>) {
    const redis = this.redisClient;
    if (!redis) return;

    for (const [messageId, fields] of entries) {
      const payload = this.parseFields(fields);
      try {
        await this.routeEvent(messageId, payload);
        await redis.xack(this.stream, this.group, messageId);
        await redis.hdel(this.failuresHash, messageId);
      } catch (error) {
        const message = (error as Error).message;
        this.logger.warn(`trip-events consume failed id=${messageId} err=${message}`);
        await this.handleFailure(messageId, payload, message);
      }
    }
  }

  async recoverPending(idleMs = 60_000, limit = 50) {
    const redis = this.redisClient;
    if (!redis || !this.groupReady) return;

    try {
      const pending = (await redis.xpending(this.stream, this.group, '-', '+', limit)) as Array<
        [string, string, number, number]
      >;
      const staleIds = pending.filter(([, , idle]) => idle >= idleMs).map(([id]) => id);
      if (!staleIds.length) return;

      const claimed = (await redis.xclaim(
        this.stream,
        this.group,
        this.consumer,
        idleMs,
        ...staleIds,
      )) as Array<[string, string[] | Record<string, string>]>;

      await this.consumeEntries(claimed);
    } catch (error) {
      this.logger.warn(`trip-events pending recovery failed: ${(error as Error).message}`);
    }
  }

  async consumeBatch(count = 50, blockMs = 2000) {
    const redis = this.redisClient;
    if (!redis || !this.groupReady) return;

    const rows = (await redis.xreadgroup(
      'GROUP',
      this.group,
      this.consumer,
      'COUNT',
      count,
      'BLOCK',
      blockMs,
      'STREAMS',
      this.stream,
      '>',
    )) as Array<[string, Array<[string, string[] | Record<string, string>]>]> | null;

    if (!rows?.length) return;

    for (const [, events] of rows) {
      await this.consumeEntries(events);
    }
  }

  private async refreshPendingCount() {
    const redis = this.redisClient;
    if (!redis || !this.groupReady) return;
    try {
      const summary = (await redis.xpending(this.stream, this.group)) as
        | [number, string, string, Array<[string, number]>]
        | null;
      const total = Array.isArray(summary) ? Number(summary[0] ?? 0) : 0;
      this.metrics?.setStreamPendingCount(Number.isFinite(total) ? total : 0);
    } catch {
      // ignore metrics refresh errors
    }
  }

  @Cron('*/10 * * * * *')
  async consumeStub() {
    await this.recoverPending();
    await this.consumeBatch();
    await this.refreshPendingCount();
  }
}
