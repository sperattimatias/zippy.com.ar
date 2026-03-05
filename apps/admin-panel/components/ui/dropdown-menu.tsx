import type { HTMLAttributes, ReactNode } from 'react';

export function DropdownMenu({ children }: { children: ReactNode }) {
  return <div className="relative">{children}</div>;
}

export function DropdownMenuTrigger({ children }: { children: ReactNode; asChild?: boolean }) {
  return <>{children}</>;
}

export function DropdownMenuContent({ children, className = '' }: { children: ReactNode; align?: 'start' | 'end'; className?: string }) {
  return <div className={`absolute right-0 z-50 mt-2 min-w-[10rem] rounded-md border border-slate-700 bg-slate-900 p-1 ${className}`}>{children}</div>;
}

export function DropdownMenuItem({ className = '', ...props }: HTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-slate-800 ${className}`} {...props} />;
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-slate-800" />;
}
