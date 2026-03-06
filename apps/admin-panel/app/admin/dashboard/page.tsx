'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { PageHeader } from '../../../components/page/PageHeader';
import { SectionCard } from '../../../components/common/SectionCard';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { EmptyState } from '../../../components/states/EmptyState';
import { ErrorState } from '../../../components/states/ErrorState';
import { LoadingState } from '../../../components/states/LoadingState';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { formatDateTime, formatMoney } from '../../../lib/format';
import { RefreshCw, ArrowUpRight } from 'lucide-react';

type MePayload = { email: string; roles: string[] };

type ReportsOverview = {
  kpis?: {
    rides_per_day?: number;
    cancel_rate?: number;
    revenue?: number;
    active_drivers?: number;
  };
  totals?: {
    rides_total?: number;
    rides_completed?: number;
    rides_cancelled?: number;
  };
};

type ListPayload = {
  items?: Array<Record<string, unknown>>;
};

type DashboardSnapshot = {
  ridesToday: number;
  revenueToday: number;
  activeDrivers: number;
  cancelRate: number;
  openTickets: number;
  failedPayments: number;
  openIncidents: number;
  previous?: {
    rides: number;
    revenue: number;
    cancelRate: number;
  };
};

const quickLinks = [
  { href: '/admin/trips', label: 'Viajes' },
  { href: '/admin/drivers', label: 'Conductores' },
  { href: '/admin/payments', label: 'Pagos' },
  { href: '/admin/support/tickets', label: 'Tickets' },
  { href: '/admin/operations/live', label: 'Live Ops' },
];

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function pct(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function asItems(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];
  const maybeItems = (payload as { items?: unknown }).items;
  return Array.isArray(maybeItems) ? maybeItems : [];
}

function MetricCard({
  label,
  value,
  trend,
  hint,
}: {
  label: string;
  value: string;
  trend?: number | null;
  hint?: string;
}) {
  const trendLabel = trend == null ? '—' : `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`;
  const trendTone = trend == null ? 'outline' : trend > 0 ? 'success' : trend < 0 ? 'danger' : 'outline';

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-100">{value}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Badge variant={trendTone}>{trendLabel}</Badge>
        {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [me, setMe] = useState<MePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const today = ymd(now);
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(now.getDate() - 1);
      const yesterday = ymd(yesterdayDate);

      const [meRes, todayOverviewRes, prevOverviewRes, ticketsRes, failedPaymentsRes, incidentsRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch(`/api/admin/reports/overview?from=${today}&to=${today}`, { cache: 'no-store' }),
        fetch(`/api/admin/reports/overview?from=${yesterday}&to=${yesterday}`, { cache: 'no-store' }),
        fetch('/api/admin/support/tickets?status=OPEN&page_size=200', { cache: 'no-store' }),
        fetch(`/api/admin/payments?status=REJECTED&from=${today}&to=${today}&page_size=200`, { cache: 'no-store' }),
        fetch('/api/admin/safety-alerts?status=OPEN', { cache: 'no-store' }),
      ]);

      if (!todayOverviewRes.ok) throw new Error('No pudimos cargar métricas del dashboard.');

      const [mePayload, todayOverview, prevOverview, ticketsPayload, failedPaymentsPayload, incidentsPayload] = await Promise.all([
        meRes.ok ? meRes.json() : Promise.resolve({ email: 'admin', roles: ['admin'] }),
        todayOverviewRes.json() as Promise<ReportsOverview>,
        prevOverviewRes.ok ? (prevOverviewRes.json() as Promise<ReportsOverview>) : Promise.resolve({} as ReportsOverview),
        ticketsRes.ok ? ticketsRes.json() : Promise.resolve({ items: [] }),
        failedPaymentsRes.ok ? failedPaymentsRes.json() : Promise.resolve({ items: [] }),
        incidentsRes.ok ? incidentsRes.json() : Promise.resolve({ items: [] }),
      ]);

      setMe({ email: mePayload.email, roles: mePayload.roles ?? [] });

      const ridesToday = Number(todayOverview.totals?.rides_total ?? 0);
      const revenueToday = Number(todayOverview.kpis?.revenue ?? 0);
      const activeDrivers = Number(todayOverview.kpis?.active_drivers ?? 0);
      const cancelRate = Number(todayOverview.kpis?.cancel_rate ?? 0);

      const openTickets = asItems(ticketsPayload).length;
      const failedPayments = asItems(failedPaymentsPayload).length;
      const openIncidents = asItems(incidentsPayload).length;

      const ridesPrev = Number(prevOverview.totals?.rides_total ?? 0);
      const revenuePrev = Number(prevOverview.kpis?.revenue ?? 0);
      const cancelRatePrev = Number(prevOverview.kpis?.cancel_rate ?? 0);

      setSnapshot({
        ridesToday,
        revenueToday,
        activeDrivers,
        cancelRate,
        openTickets,
        failedPayments,
        openIncidents,
        previous: {
          rides: ridesPrev,
          revenue: revenuePrev,
          cancelRate: cancelRatePrev,
        },
      });
      setUpdatedAt(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar el dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const attentionItems = useMemo(() => {
    if (!snapshot) return [];

    const items: Array<{ title: string; description: string; status: string }> = [];

    if (snapshot.openIncidents > 0) {
      items.push({
        title: 'Incidentes de seguridad abiertos',
        description: `Hay ${snapshot.openIncidents} incidentes pendientes de revisión.`,
        status: 'OPEN',
      });
    }

    if (snapshot.cancelRate >= 10) {
      items.push({
        title: 'Cancel rate elevado',
        description: `La tasa de cancelación actual es ${snapshot.cancelRate.toFixed(2)}%.`,
        status: 'ALERT',
      });
    }

    if (snapshot.failedPayments > 0) {
      items.push({
        title: 'Pagos rechazados hoy',
        description: `${snapshot.failedPayments} pagos fallidos requieren seguimiento.`,
        status: 'PENDING',
      });
    }

    if (snapshot.openTickets > 15) {
      items.push({
        title: 'Backlog de soporte alto',
        description: `Existen ${snapshot.openTickets} tickets abiertos.`,
        status: 'IN_PROGRESS',
      });
    }

    return items;
  }, [snapshot]);

  const chartBars = useMemo(() => {
    if (!snapshot) return [];

    const values = [
      { label: 'Viajes', value: snapshot.ridesToday },
      { label: 'Tickets', value: snapshot.openTickets },
      { label: 'Pagos fallidos', value: snapshot.failedPayments },
      { label: 'Incidentes', value: snapshot.openIncidents },
    ];

    const max = Math.max(...values.map((item) => item.value), 1);
    return values.map((item) => ({
      ...item,
      width: `${Math.max((item.value / max) * 100, item.value === 0 ? 4 : 10)}%`,
    }));
  }, [snapshot]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="Dashboard ejecutivo-operativo"
        subtitle="Monitoreo diario de operaciones, ingresos y riesgo en una sola vista."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">Actualizado: {updatedAt ? formatDateTime(updatedAt) : '-'}</Badge>
            <Button variant="secondary" onClick={() => void loadDashboard()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar ahora
            </Button>
          </div>
        }
      />

      {loading ? <LoadingState message="Cargando indicadores ejecutivos..." /> : null}
      {!loading && error ? <ErrorState message={error} retry={() => void loadDashboard()} /> : null}

      {!loading && !error && snapshot ? (
        <>
          <SectionCard title="KPIs del día" description="Comparación simple contra el período anterior (día previo).">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label="Viajes hoy"
                value={String(snapshot.ridesToday)}
                trend={pct(snapshot.ridesToday, snapshot.previous?.rides ?? 0)}
                hint="vs ayer"
              />
              <MetricCard
                label="Ingresos del día"
                value={formatMoney(snapshot.revenueToday)}
                trend={pct(snapshot.revenueToday, snapshot.previous?.revenue ?? 0)}
                hint="vs ayer"
              />
              <MetricCard label="Conductores activos" value={String(snapshot.activeDrivers)} hint="estado actual" />
              <MetricCard
                label="Cancel rate"
                value={`${snapshot.cancelRate.toFixed(2)}%`}
                trend={pct(snapshot.cancelRate, snapshot.previous?.cancelRate ?? 0)}
                hint="vs ayer"
              />
              <MetricCard label="Tickets abiertos" value={String(snapshot.openTickets)} hint="soporte" />
              <MetricCard label="Pagos fallidos" value={String(snapshot.failedPayments)} hint="hoy" />
            </div>
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Atención requerida" description="Alertas operativas para accionar rápido.">
              {attentionItems.length === 0 ? (
                <EmptyState title="Sin alertas críticas" description="No hay señales operativas fuera de umbral por ahora." />
              ) : (
                <div className="space-y-3">
                  {attentionItems.map((item) => (
                    <div key={item.title} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-100">{item.title}</p>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="text-sm text-slate-400">{item.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Tendencia operativa (hoy)" description="Visualización simple de volumen por dominio.">
              <div className="space-y-3">
                {chartBars.map((bar) => (
                  <div key={bar.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{bar.label}</span>
                      <span className="font-medium text-slate-100">{bar.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
                      <div className="h-2 rounded-full bg-cyan-500" style={{ width: bar.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Accesos rápidos" description="Navegación directa a secciones críticas.">
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button variant="outline" className="w-full justify-start">
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    {link.label}
                  </Button>
                </Link>
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}
