'use client';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
  type ColumnPinningState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { EmptyState, ErrorState, LoadingSkeleton } from '../admin/states';
import { Checkbox } from '../ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { DataTablePagination } from './pagination';

type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription?: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  toolbar?: (table: ReturnType<typeof useReactTable<TData>>) => React.ReactNode;
  rowSelectionEnabled?: boolean;
  initialVisibility?: VisibilityState;
  enablePinning?: boolean;
};

export function DataTable<TData>({
  data,
  columns,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  page,
  totalPages,
  onPageChange,
  toolbar,
  rowSelectionEnabled = true,
  initialVisibility,
  enablePinning = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialVisibility ?? {});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: [], right: [] });

  const tableColumns = useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!rowSelectionEnabled) return columns;

    return [
      {
        id: 'select',
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onChange={(event) => table.toggleAllRowsSelected(event.target.checked)}
            aria-label="Seleccionar todo"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onChange={(event) => row.toggleSelected(event.target.checked)}
            aria-label="Seleccionar fila"
          />
        ),
      },
      ...columns,
    ];
  }, [columns, rowSelectionEnabled]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    ...(enablePinning ? { onColumnPinningChange: setColumnPinning } : {}),
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      ...(enablePinning ? { columnPinning } : {}),
    },
    enableRowSelection: rowSelectionEnabled,
  });

  return (
    <div>
      {toolbar?.(table)}
      <div className="mt-4 rounded-lg border border-slate-800">
        {loading && <LoadingSkeleton rows={8} />}
        {!loading && error && <ErrorState message={error} retry={onRetry} />}
        {!loading && !error && table.getRowModel().rows.length === 0 && (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}

        {!loading && !error && table.getRowModel().rows.length > 0 && (
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <DataTablePagination table={table} page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}

export type { ColumnDef, VisibilityState, ColumnPinningState };
