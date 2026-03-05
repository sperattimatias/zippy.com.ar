'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminCard, EmptyState, ErrorState, LoadingState } from '../../../../components/admin/ui';

type KycRow = {
  id: string;
  user_id: string;
  kyc_status: string;
  missing_documents: string[];
  upcoming_expirations: Array<{ document_id: string; type: string; expires_at: string }>;
  created_at: string;
};

type KycResponse = { items: KycRow[]; total_pages: number };

export default function KycDriversPage() {
  const [rows, setRows] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (search) p.set('search', search);
    if (expiresInDays) p.set('expires_in_days', expiresInDays);
    p.set('page', String(page));
    p.set('page_size', '20');
    return p.toString();
  }, [status, search, expiresInDays, page]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/kyc/drivers?${query}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar KYC de conductores');
      const data = (await res.json()) as KycResponse;
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
      <h1 className="text-2xl font-bold">KYC · Drivers</h1>

      <AdminCard title="Filtros">
        <div className="grid gap-2 md:grid-cols-4">
          <select className="rounded bg-slate-950 p-2" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">Todos los estados</option>
            {['PENDING_DOCS', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="rounded bg-slate-950 p-2" placeholder="Buscar por driver/user" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          <input className="rounded bg-slate-950 p-2" placeholder="Expira en días" value={expiresInDays} onChange={(e) => { setPage(1); setExpiresInDays(e.target.value); }} />
        </div>
      </AdminCard>

      <AdminCard title="Conductores KYC">
        {loading && <LoadingState message="Cargando KYC..." />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && rows.length === 0 && <EmptyState message="No hay conductores para los filtros seleccionados." />}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <th className="p-2">Driver</th>
                  <th className="p-2">KYC Status</th>
                  <th className="p-2">Faltantes</th>
                  <th className="p-2">Vencimientos próximos</th>
                  <th className="p-2">Creado</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800 align-top">
                    <td className="p-2 font-mono text-xs">{row.id}<br/>user: {row.user_id}</td>
                    <td className="p-2">{row.kyc_status}</td>
                    <td className="p-2">{row.missing_documents.length ? row.missing_documents.join(', ') : 'Sin faltantes'}</td>
                    <td className="p-2 text-xs">
                      {row.upcoming_expirations.length === 0 && <span>-</span>}
                      {row.upcoming_expirations.map((exp) => (
                        <div key={exp.document_id}>{exp.type}: {new Date(exp.expires_at).toLocaleDateString()}</div>
                      ))}
                    </td>
                    <td className="p-2">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="p-2"><Link className="text-cyan-400" href={`/admin/kyc/drivers/${row.id}`}>Detalle</Link></td>
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
