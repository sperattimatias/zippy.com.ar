import type { ReactNode } from 'react';

export function AdminCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function LoadingState({ message = 'Cargando...' }: { message?: string }) {
  return <p className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">{message}</p>;
}

export function EmptyState({ message }: { message: string }) {
  return <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-400">{message}</p>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="space-y-3 rounded-lg border border-rose-500/40 bg-rose-950/20 p-4 text-sm text-rose-200">
      <p>{message}</p>
      {retry && (
        <button className="rounded bg-rose-500 px-3 py-1.5 font-medium text-slate-950" onClick={retry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Toast({ tone, message, onClose }: { tone: 'success' | 'error'; message: string; onClose: () => void }) {
  const colors = tone === 'success' ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-100' : 'border-rose-500/40 bg-rose-950/60 text-rose-100';
  return (
    <div className={`fixed bottom-5 right-5 z-50 rounded-lg border px-4 py-3 text-sm shadow-xl ${colors}`} role="status">
      <div className="flex items-center gap-4">
        <p>{message}</p>
        <button className="text-xs underline" onClick={onClose}>cerrar</button>
      </div>
    </div>
  );
}
