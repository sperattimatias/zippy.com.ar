import type { ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn('flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100', className)} {...props}>
      {children}
    </select>
  );
}

export function SelectTrigger({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
export function SelectValue({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
export function SelectContent({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function SelectItem({ value, children }: { value: string; children: ReactNode }) {
  return <option value={value}>{children}</option>;
}
