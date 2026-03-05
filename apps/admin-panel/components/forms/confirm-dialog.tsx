'use client';

import type { ReactNode } from 'react';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  loading,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-300">{description}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded bg-slate-700 px-3 py-2 text-sm" onClick={onClose} disabled={loading}>
            {cancelLabel ?? 'Cancelar'}
          </button>
          <button className="rounded bg-rose-700 px-3 py-2 text-sm text-white disabled:opacity-50" onClick={onConfirm} disabled={loading}>
            {loading ? 'Procesando…' : confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
