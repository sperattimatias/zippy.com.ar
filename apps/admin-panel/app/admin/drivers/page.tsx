'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../../components/admin/page-header';
import { SectionCard } from '../../../components/admin/section-card';
import { DataTable, type ColumnDef } from '../../../components/data-table/DataTable';
import { DataTableToolbar } from '../../../components/data-table/toolbar';
import { useDebouncedValue, useQueryState } from '../../../components/data-table/query-state';
import { Badge } from '../../../components/ui/badge';

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

const columnsBase: ColumnDef<DriverRow>[] = [
  { id: 'id', header: 'Driver ID', sortable: true, cell: (row) => <span className="font-mono text-xs">{row.id}</span>, sortValue: (row) => row.id },
  { id: 'user', header: 'User', sortable: true, cell: (row) => row.user_id, sortValue: (row) => row.user_id },
  { id: 'status', header: 'Estado', sortable: true, cell: (row) => <Badge variant={statusTone[row.status] ?? 'outline'}>{row.status}</Badge>, sortValue: (row) => row.status },
  { id: 'docs', header: 'Docs', sortable: true, cell: (row) => row.docs_count, sortValue: (row) => row.docs_count },
  { id: 'notes', header: 'Notas', cell: (row) => row.notes ?? '-' },
  { id: 'created', header: 'Creado', sortable: true, cell: (row) => new Date(row.created_at).toLocaleString(), sortValue: (row) => row.created_at },
  {
    id: 'actions',
    header: 'Acciones',
    hideable: false,
    cell: (row) => (
      <Link href={`/admin/drivers/${row.id}`} className="text-cyan-400 hover:underline">
        Detalle
      </Link>
    ),
  },
];

export default function DriversPage() {
  const { state, patch, queryString } = useQueryState({ status: '', search: '', page: '1', page_size: '20' });
  const [searchInput, setSearchInput] = useState(state.search);
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const [rows, setRows] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSearchInput(state.search);
  }, [state.search]);

  useEffect(() => {
    patch({ search: debouncedSearch, page: '1' });
  }, [debouncedSearch, patch]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/drivers?${queryString}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudo cargar conductores');
        const data = (await response.json()) as DriversResponse;
        setRows(data.items ?? []);
        setTotalPages(data.total_pages ?? 1);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Error inesperado'))
      .finally(() => setLoading(false));
  }, [queryString]);

  const columns = useMemo(() => {
    if (Object.keys(visibleColumns).length === 0) return columnsBase;
    return columnsBase.filter((column) => column.hideable === false || visibleColumns[column.id] !== false);
  }, [visibleColumns]);

  return (
    <div className="space-y-6">
      <PageHeader title="Drivers" subtitle="Gestión de conductores, estado operativo y validaciones KYC." />

      <SectionCard title="Listado" description="Patrón estándar de tabla con filtros en URL, orden y selección de filas.">
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          onRetry={() => patch({ page: state.page })}
          emptyTitle="No hay conductores"
          emptyDescription="Probá ajustar filtros o limpiar búsqueda."
          page={Number(state.page || '1')}
          totalPages={totalPages}
          onPageChange={(page) => patch({ page: String(page) })}
          toolbar={
            <DataTableToolbar
              search={searchInput}
              onSearchChange={setSearchInput}
              searchPlaceholder="Buscar nombre/phone/document"
              filters={
                <>
                  <select
                    className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100"
                    value={state.status}
                    onChange={(event) => patch({ status: event.target.value, page: '1' })}
                  >
                    <option value="">Todos</option>
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                    <option value="blocked">blocked</option>
                    <option value="pending-kyc">pending-kyc</option>
                  </select>
                </>
              }
              columns={columnsBase.map((column) => ({
                id: column.id,
                label: column.header,
                visible: visibleColumns[column.id] !== false,
                canHide: column.hideable !== false,
              }))}
              onToggleColumn={(id) =>
                setVisibleColumns((current) => ({ ...current, [id]: current[id] === false }))
              }
              onExport={() => {
                const headers = ['id', 'user_id', 'status', 'docs_count', 'notes', 'created_at'];
                const csv = [headers.join(',')].concat(
                  rows.map((row) =>
                    [
                      row.id,
                      row.user_id,
                      row.status,
                      String(row.docs_count),
                      `"${(row.notes ?? '').replace(/"/g, '""')}"`,
                      new Date(row.created_at).toISOString(),
                    ].join(','),
                  ),
                );
                const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `drivers-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            />
          }
        />
      </SectionCard>
    </div>
  );
}
