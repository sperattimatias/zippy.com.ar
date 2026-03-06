import type { Table } from '@tanstack/react-table';
import { Button } from '../ui/button';

export function DataTablePagination<TData>({
  table,
  page,
  totalPages,
  onPageChange,
}: {
  table: Table<TData>;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const selected = table.getSelectedRowModel().rows.length;

  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <span className="text-xs text-slate-400">{selected} seleccionadas</span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <span className="text-sm text-slate-300">
          Página {page} / {Math.max(1, totalPages)}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
