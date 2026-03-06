'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminCard, EmptyState, ErrorState, LoadingState } from '../../../../components/admin/ui';
import { toast } from '../../../../lib/toast';

type Ticket = {
  id: string;
  type: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: string;
  user_id: string;
  driver_id?: string | null;
  trip_id?: string | null;
  description: string;
};

type TicketsResponse = { items: Ticket[]; total_pages: number };

export default function SupportTicketsPage() {
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (priority) p.set('priority', priority);
    if (search) p.set('search', search);
    p.set('page', String(page));
    p.set('page_size', '20');
    return p.toString();
  }, [status, priority, search, page]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/support/tickets?${query}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar tickets');
      const data = (await res.json()) as TicketsResponse;
      setItems(data.items ?? []);
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

  const createQuickTicket = async () => {
    try {
      const res = await fetch('/api/admin/support/tickets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'operational_claim',
          priority: 'MEDIUM',
          user_id: 'unknown-user',
          description: 'Nuevo ticket creado desde admin',
        }),
      });
      if (!res.ok) throw new Error('No se pudo crear ticket');
      toast.success('Ticket creado');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error inesperado');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Support · Tickets</h1>

      <AdminCard title="Filtros">
        <div className="grid gap-2 md:grid-cols-4">
          <select className="rounded bg-slate-950 p-2" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">Todos los estados</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
          <select className="rounded bg-slate-950 p-2" value={priority} onChange={(e) => { setPage(1); setPriority(e.target.value); }}>
            <option value="">Todas las prioridades</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
          <input className="rounded bg-slate-950 p-2" placeholder="Buscar por id/user/trip/driver" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          <button className="rounded bg-cyan-700 px-3 py-2 text-sm" onClick={() => void createQuickTicket()}>Crear ticket rápido</button>
        </div>
      </AdminCard>

      <AdminCard title="Tickets">
        {loading && <LoadingState message="Cargando tickets..." />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && items.length === 0 && <EmptyState message="No hay tickets para los filtros seleccionados." />}

        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <th className="p-2">ID</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Priority</th>
                  <th className="p-2">CreatedAt</th>
                  <th className="p-2">User</th>
                  <th className="p-2">Driver</th>
                  <th className="p-2">Trip</th>
                  <th className="p-2">Description</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-slate-800">
                    <td className="p-2 font-mono text-xs">{ticket.id}</td>
                    <td className="p-2">{ticket.type}</td>
                    <td className="p-2">{ticket.status}</td>
                    <td className="p-2">{ticket.priority}</td>
                    <td className="p-2">{new Date(ticket.created_at).toLocaleString()}</td>
                    <td className="p-2 font-mono text-xs">{ticket.user_id}</td>
                    <td className="p-2 font-mono text-xs">{ticket.driver_id ?? '-'}</td>
                    <td className="p-2 font-mono text-xs">{ticket.trip_id ?? '-'}</td>
                    <td className="p-2 max-w-[320px] truncate">{ticket.description}</td>
                    <td className="p-2"><Link href={`/admin/support/tickets/${ticket.id}`} className="text-cyan-400">Detalle</Link></td>
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
