'use client';

import { createContext, useContext, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  const context = useContext(PopoverContext);
  if (!context) throw new Error('Popover components must be used inside <Popover>');
  return context;
}

export function Popover({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}

export function PopoverTrigger({ children }: { children: ReactNode }) {
  const { open, setOpen } = usePopoverContext();
  return (
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
      {children}
    </button>
  );
}

export function PopoverContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { open } = usePopoverContext();
  const ref = useRef<HTMLDivElement>(null);
  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn('z-50 w-72 rounded-md border border-slate-700 bg-slate-900 p-4 text-slate-100 shadow-md outline-none', className)}
      {...props}
    >
      {children}
    </div>
  );
}
