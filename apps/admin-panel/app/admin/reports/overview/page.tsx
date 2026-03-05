'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminCard, EmptyState, ErrorState, LoadingState, Toast } from '../../../../components/admin/ui';

type OverviewResponse = {
  from: string;
  to: string;
  kpis: {
    rides_per_day: number;
    cancel_rate: number;
    revenue: number;
    take_rate: number;
    active_drivers: number;
    active_riders: number;
  };
  totals: {
    rides_total: number;
    rides_completed: number;
    rides_cancelled: number;
  };
};

type ToastState = { tone: 'success' | 'error'; message: string } | null;

const toInputDate = (value: Date) => value.toISOString().slice(0, 10);

export default function ReportsOverviewPage() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(toInputDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(toInputDate(today));
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/admin/reports/overview?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar KPI overview');
      setData((await res.json()) as OverviewResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const onExportCsv = () => {
    const params = new URLSearchParams({ from, to });
    window.open(`/api/admin/reports/export.csv?${params.toString()}`, '_blank', 'noopener,noreferrer');
    setToast({ tone: 'success', message: 'Export iniciado' });
  };

  return (
    <div className="space-y-6">
      <AdminCard title="Filtros">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-slate-400">Desde</span>
            <input className="w-full rounded bg-slate-950 p-2" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-400">Hasta</span>
            <input className="w-full rounded bg-slate-950 p-2" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <div className="flex items-end gap-2 md:col-span-2">
            <button className="rounded bg-cyan-600 px-3 py-2 text-sm font-medium" onClick={() => void load()}>Aplicar</button>
            <button className="rounded bg-slate-700 px-3 py-2 text-sm" onClick={onExportCsv}>Export CSV</button>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="KPI overview">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && !data && <EmptyState message="Sin datos para el rango seleccionado" />}
        {!loading && !error && data && (
          <div className="grid gap-3 md:grid-cols-3">
            <Kpi label="Rides / día" value={data.kpis.rides_per_day.toFixed(2)} />
            <Kpi label="Cancel rate" value={`${data.kpis.cancel_rate.toFixed(2)}%`} />
            <Kpi label="Revenue" value={`$${data.kpis.revenue.toLocaleString('es-AR')}`} />
            <Kpi label="Take rate" value={`${data.kpis.take_rate.toFixed(2)}%`} />
            <Kpi label="Active drivers" value={String(data.kpis.active_drivers)} />
            <Kpi label="Active riders" value={String(data.kpis.active_riders)} />
            <Kpi label="Rides totales" value={String(data.totals.rides_total)} />
            <Kpi label="Rides completados" value={String(data.totals.rides_completed)} />
            <Kpi label="Rides cancelados" value={String(data.totals.rides_cancelled)} />
          </div>
        )}
      </AdminCard>
      {toast && <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}
