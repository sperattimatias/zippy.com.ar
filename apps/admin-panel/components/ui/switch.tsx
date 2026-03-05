'use client';

import { cn } from '../../lib/utils';

type SwitchProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function Switch({ checked = false, onCheckedChange, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cn(
        'inline-flex h-6 w-11 items-center rounded-full border border-transparent transition disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-cyan-600' : 'bg-slate-700',
        className,
      )}
      onClick={() => onCheckedChange?.(!checked)}
    >
      <span
        className={cn(
          'block h-5 w-5 rounded-full bg-white transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
