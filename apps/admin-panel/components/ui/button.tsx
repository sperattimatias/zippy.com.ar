import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'default' | 'sm' | 'lg';

export function Button({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; asChild?: boolean; children: ReactNode }) {
  const variantClass: Record<Variant, string> = {
    default: 'bg-cyan-600 text-white hover:bg-cyan-500',
    secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
    outline: 'border border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900',
    ghost: 'text-slate-200 hover:bg-slate-900',
    destructive: 'bg-rose-600 text-white hover:bg-rose-500',
  };
  const sizeClass: Record<Size, string> = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-10 px-8',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
