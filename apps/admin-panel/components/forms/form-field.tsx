import type { ReactNode } from 'react';

export function FormField({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="block font-medium text-slate-200">{label}</span>
      {description ? <span className="block text-xs text-slate-400">{description}</span> : null}
      {children}
      {error ? <span className="block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}
