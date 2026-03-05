'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../../components/admin/page-header';
import { SectionCard } from '../../../components/admin/section-card';
import { DataTable, type ColumnDef } from '../../../components/data-table/DataTable';
import { useDebouncedValue, useQueryState } from '../../../components/data-table/query-state';
import { DataTableToolbar } from '../../../components/data-table/toolbar';
import { Badge } from '../../../components/ui/badge';

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

const columnsBase: ColumnDef<PaymentRow>[] = [
  { id: 'payment', header: 'Payment ID', sortable: true, cell: (row) => <span className="font-mono text-xs">{row.payment_id}</span>, sortValue: (row) => row.payment_id },
  { id: 'trip', header: 'Trip ID', sortable: true, cell: (row) => <span className="font-mono text-xs">{row.trip_id}</span>, sortValue: (row) => row.trip_id },
  { id: 'rider', header: 'Rider', cell: (row) => <span className="font-mono text-xs">{row.rider_id}</span> },
  { id: 'driver', header: 'Driver', cell: (row) => <span className="font-mono text-xs">{row.driver_id}</span> },
  { id: 'amount', header: 'Amount', sortable: true, cell: (row) => row.amount, sortValue: (row) => row.amount },
  { id: 'fee', header: 'Fee', sortable: true, cell: (row) => row.fee_platform, sortValue: (row) => row.fee_platform },
  { id: 'status', header: 'Status', sortable: true, cell: (row) => <Badge variant={row.status === 'APPROVED' ? 'success' : 'outline'}>{row.status}</Badge>, sortValue: (row) => row.status },
  { id: 'method', header: 'Method', sortable: true, cell: (row) => row.method, sortValue: (row) => row.method },
  { id: 'created', header: 'Created', sortable: true, cell: (row) => new Date(row.created_at).toLocaleString(), sortValue: (row) => row.created_at },
  {
    id: 'actions',
    header: 'Acciones',
    hideable: false,
    cell: (row) => (
      <Link href={`/admin/payments/${row.payment_id}`} className="text-cyan-400 hover:underline">
        Detalle
      </Link>
    ),
  },
];

export default function AdminPaymentsPage() {
  const { state, patch, queryString } = useQueryState({
    status: '',
    method: '',
    trip_id: '',
    driver_id: '',
    rider_id: '',
    from: '',
    to: '',
    page: '1',
    page_size: '20',
    search: '',
  });
  const [searchInput, setSearchInput] = useState(state.search);
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});

  useEffect(() => setSearchInput(state.search), [state.search]);
  useEffect(() => patch({ search: debouncedSearch, page: '1' }), [debouncedSearch, patch]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/payments?${queryString}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('No se pudo cargar pagos');
        const data = (await res.json()) as PaymentsResponse;
        setRows(data.items ?? []);
        setTotalPages(data.total_pages ?? 1);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error inesperado'))
      .finally(() => setLoading(false));
  }, [queryString]);

  const columns = useMemo(() => {
    if (Object.keys(visibleColumns).length === 0) return columnsBase;
    return columnsBase.filter((column) => column.hideable === false || visibleColumns[column.id] !== false);
  }, [visibleColumns]);

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle="Listado de pagos con filtros compartibles vía URL." />
      <SectionCard title="Pagos" description="Tabla estándar con orden, selección y visibilidad de columnas.">
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.payment_id}
          loading={loading}
          error={error}
          onRetry={() => patch({ page: state.page })}
          emptyTitle="No hay pagos"
          emptyDescription="No hay resultados para el filtro aplicado."
          page={Number(state.page || '1')}
          totalPages={totalPages}
          onPageChange={(page) => patch({ page: String(page) })}
          toolbar={
            <DataTableToolbar
              search={searchInput}
              onSearchChange={setSearchInput}
              searchPlaceholder="Buscar payment/trip id"
              filters={
                <>
                  <select className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100" value={state.status} onChange={(e) => patch({ status: e.target.value, page: '1' })}>
                    <option value="">Todos los estados</option>
                    {['CREATED', 'PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <select className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100" value={state.method} onChange={(e) => patch({ method: e.target.value, page: '1' })}>
                    <option value="">Todos los métodos</option>
                    <option value="mercadopago">mercadopago</option>
                    <option value="unknown">unknown</option>
                  </select>
                  <input className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100" placeholder="trip_id" value={state.trip_id} onChange={(e) => patch({ trip_id: e.target.value, page: '1' })} />
                  <input className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100" placeholder="driver_id" value={state.driver_id} onChange={(e) => patch({ driver_id: e.target.value, page: '1' })} />
                  <input className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100" placeholder="rider_id" value={state.rider_id} onChange={(e) => patch({ rider_id: e.target.value, page: '1' })} />
                  <input type="date" className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100" value={state.from} onChange={(e) => patch({ from: e.target.value, page: '1' })} />
                  <input type="date" className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100" value={state.to} onChange={(e) => patch({ to: e.target.value, page: '1' })} />
                </>
              }
              columns={columnsBase.map((column) => ({ id: column.id, label: column.header, visible: visibleColumns[column.id] !== false, canHide: column.hideable !== false }))}
              onToggleColumn={(id) => setVisibleColumns((current) => ({ ...current, [id]: current[id] === false }))}
              onExport={() => {
                const headers = ['payment_id', 'trip_id', 'rider_id', 'driver_id', 'amount', 'fee_platform', 'status', 'method', 'created_at'];
                const csv = [headers.join(',')].concat(rows.map((row) => [row.payment_id, row.trip_id, row.rider_id, row.driver_id, String(row.amount), String(row.fee_platform), row.status, row.method, new Date(row.created_at).toISOString()].join(',')));
                const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
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
