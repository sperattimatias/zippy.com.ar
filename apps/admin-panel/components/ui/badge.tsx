import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors', {
  variants: {
    variant: {
      default: 'border-transparent bg-cyan-600 text-white',
      secondary: 'border-transparent bg-slate-700 text-slate-100',
      outline: 'border-slate-700 text-slate-200',
      success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
      warning: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
      danger: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
      info: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
      neutral: 'border-slate-600/60 bg-slate-700/30 text-slate-200',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
