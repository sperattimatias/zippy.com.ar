'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/admin/page-header';
import { SectionCard } from '../../../components/admin/section-card';
import { DataTable } from '../../../components/data-table/DataTable';
import { useDebouncedValue, useQueryState } from '../../../components/data-table/query-state';
import { DataTableToolbar } from '../../../components/data-table/toolbar';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';

const moneyFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

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
  total_pages: number;
};

const columnsBase: ColumnDef<TripRow>[] = [
  {
    accessorKey: 'id',
    header: 'Trip ID',
    meta: 'Trip ID',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    meta: 'Estado',
    cell: ({ row }) => <Badge variant={row.original.status === 'COMPLETED' ? 'success' : 'outline'}>{row.original.status}</Badge>,
  },
  {
    id: 'rider',
    header: 'Rider',
    meta: 'Rider',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.rider_user_id ?? row.original.passenger_user_id}</span>,
  },
  {
    id: 'driver',
    header: 'Driver',
    meta: 'Driver',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.driver_user_id ?? '-'}</span>,
  },
  { accessorKey: 'origin_address', header: 'Origen', meta: 'Origen' },
  { accessorKey: 'dest_address', header: 'Destino', meta: 'Destino' },
  {
    accessorKey: 'total',
    header: 'Total',
    meta: 'Total',
    cell: ({ row }) => moneyFormatter.format(row.original.total ?? 0),
  },
  { accessorKey: 'payment_method', header: 'Pago', meta: 'Pago', cell: ({ row }) => row.original.payment_method || '-' },
  {
    accessorKey: 'created_at',
    header: 'Creado',
    meta: 'Creado',
    cell: ({ row }) => new Date(row.original.created_at).toLocaleString('es-AR'),
  },
  {
    id: 'actions',
    header: 'Acciones',
    meta: 'Acciones',
    enableHiding: false,
    enableSorting: false,
    cell: ({ row }) => (
      <Link href={`/admin/trips/${row.original.id}`} className="text-cyan-400 hover:underline">
        Detalle
      </Link>
    ),
  },
];

export default function AdminTripsPage() {
  const { state, patch, queryString } = useQueryState({
    status: '',
    from: '',
    to: '',
    driver_id: '',
    rider_id: '',
    zone: '',
    search: '',
    page: '1',
    page_size: '20',
  });
  const [searchInput, setSearchInput] = useState(state.search);
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const [rows, setRows] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => setSearchInput(state.search), [state.search]);
  useEffect(() => patch({ search: debouncedSearch, page: '1' }), [debouncedSearch, patch]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/trips?${queryString}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudo cargar viajes');
        const data = (await response.json()) as TripsResponse;
        setRows(data.items ?? []);
        setTotalPages(data.total_pages ?? 1);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Error inesperado'))
      .finally(() => setLoading(false));
  }, [queryString, refreshTick]);

  return (
    <div className="space-y-6">
      <PageHeader title="Trips / Rides" subtitle="Tabla de viajes con filtros sincronizados en URL." />
      <SectionCard title="Viajes" description="DataTable con TanStack + shadcn/ui para ordenar, filtrar y exportar.">
        <DataTable
          data={rows}
          columns={columnsBase}
          loading={loading}
          error={error}
          onRetry={() => setRefreshTick((value) => value + 1)}
          emptyTitle="No hay viajes"
          emptyDescription="No hay resultados para este conjunto de filtros."
          page={Number(state.page || '1')}
          totalPages={totalPages}
          onPageChange={(page) => patch({ page: String(page) })}
          enablePinning
          toolbar={(table) => (
            <>
              <DataTableToolbar
                table={table}
                search={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Trip ID / texto"
                facetedFilters={[
                  {
                    key: 'status',
                    label: 'Estado',
                    value: state.status,
                    options: [
                      { label: 'COMPLETED', value: 'COMPLETED' },
                      { label: 'CANCELED', value: 'CANCELED' },
                      { label: 'IN_PROGRESS', value: 'IN_PROGRESS' },
                    ],
                    onChange: (value) => patch({ status: value, page: '1' }),
                  },
                ]}
                onRefresh={() => setRefreshTick((value) => value + 1)}
                onExport={() => {
                  const headers = ['id', 'created_at', 'status', 'rider', 'driver', 'origin', 'dest', 'total', 'payment_method'];
                  const csvLines = [headers.join(',')].concat(
                    rows.map((trip) =>
                      [
                        trip.id,
                        new Date(trip.created_at).toISOString(),
                        trip.status,
                        trip.rider_user_id ?? trip.passenger_user_id,
                        trip.driver_user_id ?? '',
                        `"${(trip.origin_address ?? '').replace(/"/g, '""')}"`,
                        `"${(trip.dest_address ?? '').replace(/"/g, '""')}"`,
                        String(trip.total ?? ''),
                        trip.payment_method ?? '',
                      ].join(','),
                    ),
                  );
                  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = `trips-${new Date().toISOString().slice(0, 10)}.csv`;
                  anchor.click();
                  URL.revokeObjectURL(url);
                }}
                enablePinning
              />
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <Input placeholder="driver_id" value={state.driver_id} onChange={(e) => patch({ driver_id: e.target.value, page: '1' })} />
                <Input placeholder="rider_id" value={state.rider_id} onChange={(e) => patch({ rider_id: e.target.value, page: '1' })} />
                <Input placeholder="zone" value={state.zone} onChange={(e) => patch({ zone: e.target.value, page: '1' })} />
                <Input type="date" value={state.from} onChange={(e) => patch({ from: e.target.value, page: '1' })} />
                <Input type="date" value={state.to} onChange={(e) => patch({ to: e.target.value, page: '1' })} />
              </div>
            </>
          )}
        />
      </SectionCard>
    </div>
  );
}
