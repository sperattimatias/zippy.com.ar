'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminCard, EmptyState, ErrorState, LoadingState, Toast } from '../../../components/admin/ui';

type TripRow = {
  id: string;
  status: string;
  passenger_user_id: string;
  rider_user_id?: string;
  driver_user_id?: string | null;
  origin_address: string;
  dest_address: string;
  created_at: string;
  total: number;
  payment_method: string;
};

type TripsResponse = {
  items: TripRow[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type ToastState = { tone: 'success' | 'error'; message: string } | null;

export default function AdminTripsPage() {
  const [rows, setRows] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [driverId, setDriverId] = useState('');
  const [riderId, setRiderId] = useState('');
  const [zone, setZone] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (driverId) params.set('driver_id', driverId);
    if (riderId) params.set('rider_id', riderId);
    if (zone) params.set('zone', zone);
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('page_size', '20');
    return params.toString();
  }, [status, from, to, driverId, riderId, zone, search, page]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/trips?${queryString}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar viajes');
      const data = (await res.json()) as TripsResponse;
      setRows(data.items ?? []);
      setTotalPages(data.total_pages ?? 1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [queryString]);

  const exportCsv = async () => {
    try {
      const res = await fetch(`/api/admin/trips?${queryString}&page_size=100`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo exportar');
      const data = (await res.json()) as TripsResponse;
      const headers = ['TripID', 'fecha', 'estado', 'rider', 'driver', 'origen', 'destino', 'total', 'metodo_pago'];
      const lines = [headers.join(',')];
      for (const trip of data.items ?? []) {
        const row = [
          trip.id,
          new Date(trip.created_at).toISOString(),
          trip.status,
          trip.rider_user_id ?? trip.passenger_user_id,
          trip.driver_user_id ?? '',
          `"${(trip.origin_address ?? '').replace(/"/g, '""')}"`,
          `"${(trip.dest_address ?? '').replace(/"/g, '""')}"`,
          String(trip.total ?? ''),
          trip.payment_method ?? '',
        ];
        lines.push(row.join(','));
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trips-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ tone: 'success', message: 'CSV exportado.' });
    } catch (exportError) {
      setToast({ tone: 'error', message: exportError instanceof Error ? exportError.message : 'Error exportando CSV' });
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">Trips / Rides</h1>
      </section>

      <AdminCard title="Filtros" action={<button className="rounded bg-slate-700 px-3 py-1.5 text-sm" onClick={() => void exportCsv()}>Export CSV</button>}>
        <div className="grid gap-2 md:grid-cols-4">
          <input className="rounded bg-slate-950 p-2" placeholder="TripID search" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          <input className="rounded bg-slate-950 p-2" placeholder="Driver ID" value={driverId} onChange={(e) => { setPage(1); setDriverId(e.target.value); }} />
          <input className="rounded bg-slate-950 p-2" placeholder="Rider ID" value={riderId} onChange={(e) => { setPage(1); setRiderId(e.target.value); }} />
          <input className="rounded bg-slate-950 p-2" placeholder="Zona" value={zone} onChange={(e) => { setPage(1); setZone(e.target.value); }} />
          <input className="rounded bg-slate-950 p-2" placeholder="Estado" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} />
          <input type="date" className="rounded bg-slate-950 p-2" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} />
          <input type="date" className="rounded bg-slate-950 p-2" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} />
        </div>
      </AdminCard>

      <AdminCard title="Listado de viajes">
        {loading && <LoadingState message="Cargando viajes..." />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && rows.length === 0 && <EmptyState message="No hay viajes para los filtros seleccionados." />}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <th className="p-2">TripID</th><th className="p-2">Fecha</th><th className="p-2">Estado</th><th className="p-2">Rider</th><th className="p-2">Driver</th><th className="p-2">Origen</th><th className="p-2">Destino</th><th className="p-2">Total</th><th className="p-2">Método de pago</th><th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((trip) => (
                  <tr key={trip.id} className="border-t border-slate-800">
                    <td className="p-2 font-mono text-xs">{trip.id}</td>
                    <td className="p-2">{new Date(trip.created_at).toLocaleString()}</td>
                    <td className="p-2">{trip.status}</td>
                    <td className="p-2">{trip.rider_user_id ?? trip.passenger_user_id}</td>
                    <td className="p-2">{trip.driver_user_id ?? '-'}</td>
                    <td className="p-2">{trip.origin_address}</td>
                    <td className="p-2">{trip.dest_address}</td>
                    <td className="p-2">{trip.total}</td>
                    <td className="p-2">{trip.payment_method}</td>
                    <td className="p-2"><Link className="text-cyan-400" href={`/admin/trips/${trip.id}`}>Detalle</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="rounded bg-slate-800 px-3 py-1 text-sm disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>Anterior</button>
          <span className="text-sm text-slate-300">Página {page} / {totalPages}</span>
          <button className="rounded bg-slate-800 px-3 py-1 text-sm disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>Siguiente</button>
        </div>
      </AdminCard>

      {toast && <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
