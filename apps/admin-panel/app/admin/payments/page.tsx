'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/page/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { DataTable } from '../../../components/data-table/DataTable';
import { useDebouncedValue, useQueryState } from '../../../components/data-table/query-state';
import { DataTableToolbar } from '../../../components/data-table/toolbar';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';

const moneyFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

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
  total_pages: number;
};

const columnsBase: ColumnDef<PaymentRow>[] = [
  { accessorKey: 'payment_id', header: 'Payment ID', meta: 'Payment ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.payment_id}</span> },
  { accessorKey: 'trip_id', header: 'Trip ID', meta: 'Trip ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.trip_id}</span> },
  { accessorKey: 'rider_id', header: 'Rider', meta: 'Rider', cell: ({ row }) => <span className="font-mono text-xs">{row.original.rider_id}</span> },
  { accessorKey: 'driver_id', header: 'Driver', meta: 'Driver', cell: ({ row }) => <span className="font-mono text-xs">{row.original.driver_id}</span> },
  { accessorKey: 'amount', header: 'Monto', meta: 'Monto', cell: ({ row }) => moneyFormatter.format(row.original.amount ?? 0) },
  { accessorKey: 'fee_platform', header: 'Fee', meta: 'Fee', cell: ({ row }) => moneyFormatter.format(row.original.fee_platform ?? 0) },
  { accessorKey: 'status', header: 'Status', meta: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'APPROVED' ? 'success' : 'outline'}>{row.original.status}</Badge> },
  { accessorKey: 'method', header: 'Método', meta: 'Método' },
  { accessorKey: 'created_at', header: 'Creado', meta: 'Creado', cell: ({ row }) => new Date(row.original.created_at).toLocaleString('es-AR') },
  {
    id: 'actions',
    header: 'Acciones',
    meta: 'Acciones',
    enableHiding: false,
    enableSorting: false,
    cell: ({ row }) => (
      <Link href={`/admin/payments/${row.original.payment_id}`} className="text-cyan-400 hover:underline">
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
  const [refreshTick, setRefreshTick] = useState(0);

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
  }, [queryString, refreshTick]);

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle="Listado de pagos con filtros compartibles vía URL." />
      <Card>
        <CardHeader>
          <CardTitle>Pagos</CardTitle>
          <CardDescription>Tabla TanStack con estado consistente de empty/loading/error.</CardDescription>
        </CardHeader>
        <CardContent>
        <DataTable
          data={rows}
          columns={columnsBase}
          loading={loading}
          error={error}
          onRetry={() => setRefreshTick((value) => value + 1)}
          emptyTitle="No hay pagos"
          emptyDescription="No hay resultados para el filtro aplicado."
          page={Number(state.page || '1')}
          totalPages={totalPages}
          onPageChange={(page) => patch({ page: String(page) })}
          toolbar={(table) => (
            <>
              <DataTableToolbar
                table={table}
                search={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Buscar payment/trip id"
                facetedFilters={[
                  {
                    key: 'status',
                    label: 'Status',
                    value: state.status,
                    options: ['CREATED', 'PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'].map((status) => ({ label: status, value: status })),
                    onChange: (value) => patch({ status: value, page: '1' }),
                  },
                  {
                    key: 'method',
                    label: 'Método',
                    value: state.method,
                    options: [
                      { label: 'mercadopago', value: 'mercadopago' },
                      { label: 'unknown', value: 'unknown' },
                    ],
                    onChange: (value) => patch({ method: value, page: '1' }),
                  },
                ]}
                onRefresh={() => setRefreshTick((value) => value + 1)}
                onExport={() => {
                  const headers = ['payment_id', 'trip_id', 'rider_id', 'driver_id', 'amount', 'fee_platform', 'status', 'method', 'created_at'];
                  const csv = [headers.join(',')].concat(
                    rows.map((row) =>
                      [
                        row.payment_id,
                        row.trip_id,
                        row.rider_id,
                        row.driver_id,
                        String(row.amount),
                        String(row.fee_platform),
                        row.status,
                        row.method,
                        new Date(row.created_at).toISOString(),
                      ].join(','),
                    ),
                  );
                  const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              />
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <Input placeholder="trip_id" value={state.trip_id} onChange={(e) => patch({ trip_id: e.target.value, page: '1' })} />
                <Input placeholder="driver_id" value={state.driver_id} onChange={(e) => patch({ driver_id: e.target.value, page: '1' })} />
                <Input placeholder="rider_id" value={state.rider_id} onChange={(e) => patch({ rider_id: e.target.value, page: '1' })} />
                <Input type="date" value={state.from} onChange={(e) => patch({ from: e.target.value, page: '1' })} />
                <Input type="date" value={state.to} onChange={(e) => patch({ to: e.target.value, page: '1' })} />
              </div>
            </>
          )}
        />
        </CardContent>
      </Card>
    </div>
  );
}
