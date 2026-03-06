import { TableSkeleton } from './TableSkeleton';

export function LoadingState({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <p className="text-sm text-slate-300">{message}</p>
      <TableSkeleton rows={4} />
    </div>
  );
}
