import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full caption-bottom text-sm', className)} {...props} />;
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('[&_tr]:border-b [&_tr]:border-slate-800 bg-slate-900 text-slate-400', className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-slate-800 transition-colors hover:bg-slate-900/60 data-[state=selected]:bg-slate-900/80', className)} {...props} />;
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('h-11 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-slate-400', className)} {...props} />;
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('p-3 align-middle text-slate-100', className)} {...props} />;
}
