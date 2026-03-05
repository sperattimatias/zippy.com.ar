import { Button } from '../ui/button';

export function DataTablePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
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
  );
}
