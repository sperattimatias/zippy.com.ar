'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { formatId } from '../../lib/format';
import { toast } from '../../lib/toast';

export function CopyText({ value, truncate = true }: { value: string | null | undefined; truncate?: boolean }) {
  const [copied, setCopied] = useState(false);

  if (!value) return <span className="text-slate-400">-</span>;

  const label = truncate ? formatId(value) : value;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copiado al portapapeles');
      window.setTimeout(() => setCopied(false), 1200);
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
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? 'Copiado' : 'Copiar'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
