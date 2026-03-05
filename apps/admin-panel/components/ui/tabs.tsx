import type { HTMLAttributes, ReactNode } from 'react';

export function Tabs({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function TabsList({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`inline-flex h-9 items-center rounded-lg bg-slate-900 p-1 text-slate-300 ${className}`} {...props} />;
}
export function TabsTrigger({ className = '', ...props }: HTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`inline-flex items-center justify-center rounded-md px-3 py-1 text-sm hover:bg-slate-800 ${className}`} {...props} />;
}
export function TabsContent({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-2 ${className}`} {...props} />;
}
