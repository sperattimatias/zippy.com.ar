'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminCard, EmptyState, ErrorState, LoadingState } from '../../../components/admin/ui';

type PaymentRow = {
  payment_id: string;
  trip_id: string;
  rider_id: string;
  driver_id: string;
  amount: number;
  fee_platform: number;
  status: string;
  method: string;
  created_at: string;
};

type PaymentsResponse = {
  items: PaymentRow[];
  page: number;
  total_pages: number;
};

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [tripId, setTripId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [riderId, setRiderId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (method) p.set('method', method);
    if (tripId) p.set('trip_id', tripId);
    if (driverId) p.set('driver_id', driverId);
    if (riderId) p.set('rider_id', riderId);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    p.set('page', String(page));
    p.set('page_size', '20');
    return p.toString();
  }, [status, method, tripId, driverId, riderId, from, to, page]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payments?${query}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar pagos');
      const data = (await res.json()) as PaymentsResponse;
      setRows(data.items ?? []);
      setTotalPages(data.total_pages ?? 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [query]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

      <AdminCard title="Filtros">
        <div className="grid gap-2 md:grid-cols-4">
          <select className="rounded bg-slate-950 p-2" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">Todos los estados</option>
            {['CREATED', 'PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="rounded bg-slate-950 p-2" value={method} onChange={(e) => { setPage(1); setMethod(e.target.value); }}>
            <option value="">Todos los métodos</option>
            <option value="mercadopago">mercadopago</option>
            <option value="unknown">unknown</option>
          </select>
          <input className="rounded bg-slate-950 p-2" placeholder="tripId" value={tripId} onChange={(e) => { setPage(1); setTripId(e.target.value); }} />
          <input className="rounded bg-slate-950 p-2" placeholder="driverId" value={driverId} onChange={(e) => { setPage(1); setDriverId(e.target.value); }} />
          <input className="rounded bg-slate-950 p-2" placeholder="riderId" value={riderId} onChange={(e) => { setPage(1); setRiderId(e.target.value); }} />
          <input type="date" className="rounded bg-slate-950 p-2" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} />
          <input type="date" className="rounded bg-slate-950 p-2" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} />
        </div>
      </AdminCard>

      <AdminCard title="Listado de pagos">
        {loading && <LoadingState message="Cargando pagos..." />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && rows.length === 0 && <EmptyState message="No hay pagos para los filtros seleccionados." />}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <th className="p-2">PaymentID</th><th className="p-2">TripID</th><th className="p-2">Rider</th><th className="p-2">Driver</th>
                  <th className="p-2">Amount</th><th className="p-2">Fee</th><th className="p-2">Status</th><th className="p-2">Method</th><th className="p-2">CreatedAt</th><th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.payment_id} className="border-t border-slate-800">
                    <td className="p-2 font-mono text-xs">{row.payment_id}</td>
                    <td className="p-2 font-mono text-xs">{row.trip_id}</td>
                    <td className="p-2 font-mono text-xs">{row.rider_id}</td>
                    <td className="p-2 font-mono text-xs">{row.driver_id}</td>
                    <td className="p-2">{row.amount}</td>
                    <td className="p-2">{row.fee_platform}</td>
                    <td className="p-2">{row.status}</td>
                    <td className="p-2">{row.method}</td>
                    <td className="p-2">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="p-2"><Link href={`/admin/payments/${row.payment_id}`} className="text-cyan-400">Detalle</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="rounded bg-slate-800 px-3 py-1 text-sm disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span className="text-sm">Página {page} / {totalPages}</span>
          <button className="rounded bg-slate-800 px-3 py-1 text-sm disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
        </div>
      </AdminCard>
    </div>
  );
}
