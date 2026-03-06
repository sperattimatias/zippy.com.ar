'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../../components/page/PageHeader';
import { SectionCard } from '../../../components/common/SectionCard';
import { EmptyState } from '../../../components/states/EmptyState';
import { ErrorState } from '../../../components/states/ErrorState';
import { LoadingState } from '../../../components/states/LoadingState';
import { CopyText } from '../../../components/common/CopyText';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatDateTime } from '../../../lib/format';

type UserRow = {
  id: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  total_trips: number;
  flags?: { payment_limited?: boolean };
};

type UsersResponse = { items: UserRow[]; page: number; total_pages: number };

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('page_size', '20');
    return params.toString();
  }, [status, from, search, page]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?${query}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar usuarios');
      const data = (await res.json()) as UsersResponse;
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
  }, [query]);

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" subtitle="Administrá cuentas y revisá la actividad de usuarios." />

      <SectionCard title="Filtros">
        <div className="grid gap-2 md:grid-cols-4">
          <select className="rounded bg-slate-950 p-2" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">Todos</option>
            <option value="active">active</option>
            <option value="blocked">blocked</option>
          </select>
          <input type="date" className="rounded bg-slate-950 p-2" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} />
          <input className="rounded bg-slate-950 p-2" placeholder="Buscar por usuario, email o teléfono" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        </div>
      </SectionCard>

      <SectionCard title="Listado de usuarios">
        {loading && <LoadingState message="Cargando usuarios..." />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && rows.length === 0 && <EmptyState title="No hay resultados" description="Probá ajustar los filtros para encontrar resultados." />}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                <tr><th className="p-2">UserID</th><th className="p-2">Email</th><th className="p-2">Phone</th><th className="p-2">Estado</th><th className="p-2">CreatedAt</th><th className="p-2">Total trips</th><th className="p-2">Flags</th><th className="p-2"></th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800">
                    <td className="p-2"><CopyText value={row.id} /></td>
                    <td className="p-2">{row.email}</td>
                    <td className="p-2">{row.phone ?? '-'}</td>
                    <td className="p-2"><StatusBadge status={row.status} /></td>
                    <td className="p-2">{formatDateTime(row.created_at)}</td>
                    <td className="p-2">{row.total_trips ?? 0}</td>
                    <td className="p-2">{row.flags?.payment_limited ? 'payment_limited' : '-'}</td>
                    <td className="p-2"><Link href={`/admin/users/${row.id}`} className="text-cyan-400">Detalle</Link></td>
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
      </SectionCard>
    </div>
  );
}
