'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../../components/admin/page-header';
import { SectionCard } from '../../../components/admin/section-card';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../../components/admin/states';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

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

const statusTone: Record<string, 'success' | 'danger' | 'outline'> = {
  active: 'success',
  suspended: 'danger',
  blocked: 'danger',
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
      const message = loadError instanceof Error ? loadError.message : 'Error inesperado';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [queryString]);

  return (
    <div className="space-y-6">
      <PageHeader title="Drivers" subtitle="Gestión de conductores, estado operativo y validaciones KYC." />

      <SectionCard title="Filtros" description="Acotá el listado por estado o búsqueda textual.">
        <div className="grid gap-3 md:grid-cols-3">
          <select
            className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">Todos</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="blocked">blocked</option>
            <option value="pending-kyc">pending-kyc</option>
          </select>
          <Input
            placeholder="Buscar nombre/phone/document"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
      </SectionCard>

      <SectionCard title="Listado de conductores" description="Vista paginada de conductores y su estado.">
        {loading && <LoadingSkeleton rows={6} />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && rows.length === 0 && (
          <EmptyState title="No hay conductores" description="Probá ajustar filtros o limpiar la búsqueda." />
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <th className="p-3">Driver ID</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Docs</th>
                  <th className="p-3">Notas</th>
                  <th className="p-3">Creado</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800">
                    <td className="p-3 font-mono text-xs">{row.id}</td>
                    <td className="p-3">{row.user_id}</td>
                    <td className="p-3">
                      <Badge variant={statusTone[row.status] ?? 'outline'}>{row.status}</Badge>
                    </td>
                    <td className="p-3">{row.docs_count}</td>
                    <td className="p-3">{row.notes ?? '-'}</td>
                    <td className="p-3">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="p-3">
                      <Link href={`/admin/drivers/${row.id}`} className="text-cyan-400 hover:underline">Detalle</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-slate-300">
            Página {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Siguiente
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
