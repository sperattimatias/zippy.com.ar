import type { ReactNode } from 'react';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

export function EmptyState({ title, description, actionButton }: { title: string; description?: string; actionButton?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
      <p className="text-sm font-medium text-slate-200">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
      {actionButton ? <div className="mt-4">{actionButton}</div> : null}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-4 text-sm text-rose-200">
      <p className="font-medium">Ocurrió un error</p>
      <p className="mt-1">{message}</p>
      {retry ? (
        <Button variant="destructive" size="sm" className="mt-3" onClick={retry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, idx) => (
        <Skeleton key={idx} className="h-10 w-full" />
      ))}
    </div>
  );
}
