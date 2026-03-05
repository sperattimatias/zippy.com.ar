'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminCard, EmptyState, ErrorState, LoadingState } from '../../../components/admin/ui';

type DriverRow = {
  id: string;
  user_id: string;
  status: string;
  docs_count: number;
  created_at: string;
  notes?: string | null;
};

type DriversResponse = {
  items: DriverRow[];
  page: number;
  total_pages: number;
};

export default function DriversPage() {
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('page_size', '20');
    return params.toString();
  }, [status, search, page]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/drivers?${queryString}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo cargar conductores');
      const data = (await response.json()) as DriversResponse;
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

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">Drivers</h1>
      </section>

      <AdminCard title="Filtros">
        <div className="grid gap-2 md:grid-cols-3">
          <select className="rounded bg-slate-950 p-2" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">Todos</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="blocked">blocked</option>
            <option value="pending-kyc">pending-kyc</option>
          </select>
          <input className="rounded bg-slate-950 p-2" placeholder="Buscar nombre/phone/document" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        </div>
      </AdminCard>

      <AdminCard title="Listado de conductores">
        {loading && <LoadingState message="Cargando conductores..." />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && rows.length === 0 && <EmptyState message="No hay conductores para los filtros seleccionados." />}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                <tr><th className="p-2">Driver ID</th><th className="p-2">User</th><th className="p-2">Estado</th><th className="p-2">Docs</th><th className="p-2">Notas</th><th className="p-2">Creado</th><th className="p-2"></th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800">
                    <td className="p-2 font-mono text-xs">{row.id}</td>
                    <td className="p-2">{row.user_id}</td>
                    <td className="p-2">{row.status}</td>
                    <td className="p-2">{row.docs_count}</td>
                    <td className="p-2">{row.notes ?? '-'}</td>
                    <td className="p-2">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="p-2"><Link href={`/admin/drivers/${row.id}`} className="text-cyan-400">Detalle</Link></td>
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
    </div>
  );
}
