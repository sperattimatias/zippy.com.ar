import type { ReactNode } from 'react';

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function Tooltip({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function TooltipTrigger({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function TooltipContent({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-900">{children}</span>;
}
