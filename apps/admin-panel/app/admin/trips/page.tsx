'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../../components/admin/page-header';
import { SectionCard } from '../../../components/admin/section-card';
import { DataTable, type ColumnDef } from '../../../components/data-table/DataTable';
import { useDebouncedValue, useQueryState } from '../../../components/data-table/query-state';
import { DataTableToolbar } from '../../../components/data-table/toolbar';
import { Badge } from '../../../components/ui/badge';

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

const columnsBase: ColumnDef<TripRow>[] = [
  { id: 'id', header: 'Trip ID', sortable: true, cell: (row) => <span className="font-mono text-xs">{row.id}</span>, sortValue: (row) => row.id },
  { id: 'status', header: 'Estado', sortable: true, cell: (row) => <Badge variant={row.status === 'COMPLETED' ? 'success' : 'outline'}>{row.status}</Badge>, sortValue: (row) => row.status },
  { id: 'rider', header: 'Rider', cell: (row) => <span className="font-mono text-xs">{row.rider_user_id ?? row.passenger_user_id}</span> },
  { id: 'driver', header: 'Driver', cell: (row) => <span className="font-mono text-xs">{row.driver_user_id ?? '-'}</span> },
  { id: 'origin', header: 'Origen', cell: (row) => row.origin_address },
  { id: 'dest', header: 'Destino', cell: (row) => row.dest_address },
  { id: 'total', header: 'Total', sortable: true, cell: (row) => row.total, sortValue: (row) => row.total },
  { id: 'payment', header: 'Pago', cell: (row) => row.payment_method || '-' },
  { id: 'created', header: 'Creado', sortable: true, cell: (row) => new Date(row.created_at).toLocaleString(), sortValue: (row) => row.created_at },
  {
    id: 'actions',
    header: 'Acciones',
    hideable: false,
    cell: (row) => (
      <Link href={`/admin/trips/${row.id}`} className="text-cyan-400 hover:underline">
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
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});

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
  }, [queryString]);

  const columns = useMemo(() => {
    if (Object.keys(visibleColumns).length === 0) return columnsBase;
    return columnsBase.filter((column) => column.hideable === false || visibleColumns[column.id] !== false);
  }, [visibleColumns]);

  return (
    <div className="space-y-6">
      <PageHeader title="Trips / Rides" subtitle="Tabla de viajes con estado de filtros sincronizado en URL." />
      <SectionCard title="Viajes" description="DataTable estándar con selección, orden y visibilidad de columnas.">
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          onRetry={() => patch({ page: state.page })}
          emptyTitle="No hay viajes"
          emptyDescription="No hay resultados para este conjunto de filtros."
          page={Number(state.page || '1')}
          totalPages={totalPages}
          onPageChange={(page) => patch({ page: String(page) })}
          toolbar={
            <DataTableToolbar
              search={searchInput}
              onSearchChange={setSearchInput}
              searchPlaceholder="Trip ID / texto"
              filters={
                <>
                  <input className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100" placeholder="driver_id" value={state.driver_id} onChange={(e) => patch({ driver_id: e.target.value, page: '1' })} />
                  <input className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100" placeholder="rider_id" value={state.rider_id} onChange={(e) => patch({ rider_id: e.target.value, page: '1' })} />
                  <input className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100" placeholder="status" value={state.status} onChange={(e) => patch({ status: e.target.value, page: '1' })} />
                  <input className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100" placeholder="zone" value={state.zone} onChange={(e) => patch({ zone: e.target.value, page: '1' })} />
                  <input type="date" className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100" value={state.from} onChange={(e) => patch({ from: e.target.value, page: '1' })} />
                  <input type="date" className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100" value={state.to} onChange={(e) => patch({ to: e.target.value, page: '1' })} />
                </>
              }
              columns={columnsBase.map((column) => ({ id: column.id, label: column.header, visible: visibleColumns[column.id] !== false, canHide: column.hideable !== false }))}
              onToggleColumn={(id) => setVisibleColumns((current) => ({ ...current, [id]: current[id] === false }))}
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
            />
          }
        />
      </SectionCard>
    </div>
  );
}
