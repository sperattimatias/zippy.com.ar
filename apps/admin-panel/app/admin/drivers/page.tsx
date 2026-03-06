'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/page/PageHeader';
import { SectionCard } from '../../../components/common/SectionCard';
import { DataTable } from '../../../components/data-table/DataTable';
import { useDebouncedValue, useQueryState } from '../../../components/data-table/query-state';
import { DataTableToolbar } from '../../../components/data-table/toolbar';
import { CopyText } from '../../../components/common/CopyText';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatDateTime } from '../../../lib/format';

const statusTone: Record<string, 'success' | 'danger' | 'outline'> = {
  active: 'success',
  suspended: 'danger',
  blocked: 'danger',
};

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
  total_pages: number;
};

const columnsBase: ColumnDef<DriverRow>[] = [
  { accessorKey: 'id', header: 'Driver ID', meta: 'Driver ID', cell: ({ row }) => <CopyText value={row.original.id} /> },
  { accessorKey: 'user_id', header: 'User', meta: 'User', cell: ({ row }) => <CopyText value={row.original.user_id} /> },
  { accessorKey: 'status', header: 'Estado', meta: 'Estado', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: 'docs_count', header: 'Docs', meta: 'Docs' },
  { accessorKey: 'notes', header: 'Notas', meta: 'Notas', cell: ({ row }) => row.original.notes ?? '-' },
  { accessorKey: 'created_at', header: 'Creado', meta: 'Creado', cell: ({ row }) => formatDateTime(row.original.created_at) },
  {
    id: 'actions',
    header: 'Acciones',
    meta: 'Acciones',
    enableHiding: false,
    enableSorting: false,
    cell: ({ row }) => (
      <Link href={`/admin/drivers/${row.original.id}`} className="text-cyan-400 hover:underline">
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
  const [refreshTick, setRefreshTick] = useState(0);

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
  }, [queryString, refreshTick]);

  return (
    <div className="space-y-6">
      <PageHeader title="Gestión de conductores" subtitle="Gestión de conductores, estado operativo y validaciones KYC." />

      <SectionCard title="Listado" description="Tabla TanStack con filtros URL y export de dataset actual.">
        <DataTable
          data={rows}
          columns={columnsBase}
          loading={loading}
          error={error}
          onRetry={() => setRefreshTick((value) => value + 1)}
          emptyTitle="No hay resultados"
          emptyDescription="Probá ajustar los filtros o crear un nuevo registro."
          page={Number(state.page || '1')}
          totalPages={totalPages}
          onPageChange={(page) => patch({ page: String(page) })}
          toolbar={(table) => (
            <DataTableToolbar
              table={table}
              search={searchInput}
              onSearchChange={setSearchInput}
              searchPlaceholder="Buscar nombre/phone/document"
              facetedFilters={[
                {
                  key: 'status',
                  label: 'Estado',
                  value: state.status,
                  options: [
                    { label: 'active', value: 'active' },
                    { label: 'suspended', value: 'suspended' },
                    { label: 'blocked', value: 'blocked' },
                    { label: 'pending-kyc', value: 'pending-kyc' },
                  ],
                  onChange: (value) => patch({ status: value, page: '1' }),
                },
              ]}
              onRefresh={() => setRefreshTick((value) => value + 1)}
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
          )}
        />
      </SectionCard>
    </div>
  );
}
