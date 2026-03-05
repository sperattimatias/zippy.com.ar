import type { HTMLAttributes, ReactNode } from 'react';

export function Dialog({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function DialogTrigger({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function DialogClose({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function DialogContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-700 bg-slate-900 p-6 ${className}`}>{children}</div>;
}
export function DialogHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mb-4 space-y-1 ${className}`} {...props} />;
}
export function DialogTitle({ className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-lg font-semibold ${className}`} {...props} />;
}
export function DialogDescription({ className = '', ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-slate-400 ${className}`} {...props} />;
}
