import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn('h-4 w-4 rounded border border-slate-600 bg-slate-950 text-cyan-500 accent-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50', className)}
      {...props}
    />
  );
}
