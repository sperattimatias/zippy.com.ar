'use client';

import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { formatId } from '../../lib/format';
import { toast } from '../../lib/toast';

export function CopyText({ value, truncate = true }: { value: string | null | undefined; truncate?: boolean }) {
  if (!value) return <span className="text-slate-400">-</span>;

  const label = truncate ? formatId(value) : value;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 font-mono text-xs" onClick={() => void onCopy()}>
            <span>{label}</span>
            <span aria-hidden>⧉</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copiar</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
