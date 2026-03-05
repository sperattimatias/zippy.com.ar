'use client';

import { useMemo, useState } from 'react';
import { EmptyState, ErrorState, LoadingSkeleton } from '../admin/states';
import { DataTablePagination } from './pagination';

type ColumnDef<T> = {
  id: string;
  header: string;
  sortable?: boolean;
  hideable?: boolean;
  className?: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
};

export function DataTable<T>({
  data,
  columns,
  getRowId,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  page,
  totalPages,
  onPageChange,
  toolbar,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription?: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  toolbar?: React.ReactNode;
}) {
  const [sortBy, setSortBy] = useState<{ id: string; desc: boolean } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  const sortedData = useMemo(() => {
    if (!sortBy) return data;
    const column = columns.find((item) => item.id === sortBy.id);
    if (!column || !column.sortable) return data;
    const getValue = column.sortValue ?? ((row: T) => String(column.cell(row) ?? ''));
    const sorted = [...data].sort((left, right) => {
      const leftValue = getValue(left);
      const rightValue = getValue(right);
      if (leftValue < rightValue) return sortBy.desc ? 1 : -1;
      if (leftValue > rightValue) return sortBy.desc ? -1 : 1;
      return 0;
    });
    return sorted;
  }, [columns, data, sortBy]);

  const allSelected = sortedData.length > 0 && sortedData.every((row) => selectedRows[getRowId(row)]);

  return (
    <div>
      {toolbar}
      <div className="mt-4 rounded-lg border border-slate-800">
        {loading && <LoadingSkeleton rows={8} />}
        {!loading && error && <ErrorState message={error} retry={onRetry} />}
        {!loading && !error && sortedData.length === 0 && (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
        {!loading && !error && sortedData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <th className="p-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedRows(Object.fromEntries(sortedData.map((row) => [getRowId(row), true])));
                          return;
                        }
                        setSelectedRows({});
                      }}
                    />
                  </th>
                  {columns.map((column) => (
                    <th key={column.id} className={`p-3 ${column.className ?? ''}`}>
                      {column.sortable ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-slate-200"
                          onClick={() =>
                            setSortBy((current) =>
                              current?.id === column.id ? { id: column.id, desc: !current.desc } : { id: column.id, desc: false },
                            )
                          }
                        >
                          {column.header}
                          {sortBy?.id === column.id ? (sortBy.desc ? '↓' : '↑') : '↕'}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row) => (
                  <tr key={getRowId(row)} className="border-t border-slate-800">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={!!selectedRows[getRowId(row)]}
                        onChange={(event) =>
                          setSelectedRows((current) => ({ ...current, [getRowId(row)]: event.target.checked }))
                        }
                      />
                    </td>
                    {columns.map((column) => (
                      <td key={`${getRowId(row)}-${column.id}`} className={`p-3 ${column.className ?? ''}`}>
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <DataTablePagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}

export type { ColumnDef };
