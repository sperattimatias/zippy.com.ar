'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/page/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { DataTable } from '../../../components/data-table/DataTable';
import { useDebouncedValue, useQueryState } from '../../../components/data-table/query-state';
import { DataTableToolbar } from '../../../components/data-table/toolbar';
import { CopyText } from '../../../components/common/CopyText';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Input } from '../../../components/ui/input';
import { formatDateTime, formatMoney } from '../../../lib/format';

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
  { accessorKey: 'payment_id', header: 'Payment ID', meta: 'Payment ID', cell: ({ row }) => <CopyText value={row.original.payment_id} /> },
  { accessorKey: 'trip_id', header: 'Trip ID', meta: 'Trip ID', cell: ({ row }) => <CopyText value={row.original.trip_id} /> },
  { accessorKey: 'rider_id', header: 'Rider', meta: 'Rider', cell: ({ row }) => <CopyText value={row.original.rider_id} /> },
  { accessorKey: 'driver_id', header: 'Driver', meta: 'Driver', cell: ({ row }) => <CopyText value={row.original.driver_id} /> },
  { accessorKey: 'amount', header: 'Monto', meta: 'Monto', cell: ({ row }) => formatMoney(row.original.amount) },
  { accessorKey: 'fee_platform', header: 'Fee', meta: 'Fee', cell: ({ row }) => formatMoney(row.original.fee_platform) },
  { accessorKey: 'status', header: 'Status', meta: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: 'method', header: 'Método', meta: 'Método' },
  { accessorKey: 'created_at', header: 'Creado', meta: 'Creado', cell: ({ row }) => formatDateTime(row.original.created_at) },
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
      <PageHeader title="Pagos y cobros" subtitle="Supervisá pagos, aplicá filtros y exportá información clave." />
      <Card>
        <CardHeader>
          <CardTitle>Listado de pagos</CardTitle>
          <CardDescription>Tabla TanStack con estado consistente de empty/loading/error.</CardDescription>
        </CardHeader>
        <CardContent>
        <DataTable
          data={rows}
          columns={columnsBase}
          loading={loading}
          error={error}
          onRetry={() => setRefreshTick((value) => value + 1)}
          emptyTitle="No hay resultados"
          emptyDescription="Probá ajustar los filtros para encontrar resultados."
          page={Number(state.page || '1')}
          totalPages={totalPages}
          onPageChange={(page) => patch({ page: String(page) })}
          toolbar={(table) => (
            <>
              <DataTableToolbar
                table={table}
                search={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Buscar por ID de pago o viaje"
                facetedFilters={[
                  {
                    key: 'status',
                    label: 'Estado',
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
                <Input placeholder="ID de viaje" value={state.trip_id} onChange={(e) => patch({ trip_id: e.target.value, page: '1' })} />
                <Input placeholder="ID de conductor" value={state.driver_id} onChange={(e) => patch({ driver_id: e.target.value, page: '1' })} />
                <Input placeholder="ID de pasajero" value={state.rider_id} onChange={(e) => patch({ rider_id: e.target.value, page: '1' })} />
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
