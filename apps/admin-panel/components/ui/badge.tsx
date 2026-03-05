import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'default' | 'secondary' | 'outline' | 'success' | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantClass: Record<Variant, string> = {
    default: 'border-transparent bg-cyan-600 text-white',
    secondary: 'border-transparent bg-slate-700 text-slate-100',
    outline: 'border-slate-700 text-slate-200',
    success: 'border-transparent bg-emerald-700/50 text-emerald-200',
    danger: 'border-transparent bg-rose-700/50 text-rose-200',
  };
  return <div className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', variantClass[variant], className)} {...props} />;
}
