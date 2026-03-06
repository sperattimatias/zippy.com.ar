import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  CreditCard,
  LifeBuoy,
  Route,
  XCircle,
} from 'lucide-react';

import { EmptyState } from '../states/EmptyState';
import { StatusBadge } from './StatusBadge';

type EventTimelineItem = {
  id: string;
  title: string;
  timestamp: string;
  description?: string;
  status?: string;
  icon?: ReactNode;
};

function resolveIcon(item: EventTimelineItem) {
  if (item.icon) return item.icon;

  const text = `${item.title} ${item.description ?? ''}`.toLowerCase();
  const status = (item.status ?? '').toLowerCase();

  if (status.includes('completed') || status.includes('paid') || status.includes('approved') || status.includes('resolved')) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  }
  if (status.includes('failed') || status.includes('rejected') || status.includes('cancel')) {
    return <XCircle className="h-4 w-4 text-rose-300" />;
  }
  if (text.includes('trip') || text.includes('viaje') || text.includes('route') || text.includes('matching')) {
    return <Route className="h-4 w-4 text-cyan-300" />;
  }
  if (text.includes('payment') || text.includes('pago') || text.includes('refund') || text.includes('gateway')) {
    return <CreditCard className="h-4 w-4 text-sky-300" />;
  }
  if (text.includes('ticket') || text.includes('note') || text.includes('soporte') || text.includes('support')) {
    return <LifeBuoy className="h-4 w-4 text-amber-300" />;
  }
  if (text.includes('alert') || text.includes('incident') || text.includes('fraud')) {
    return <AlertTriangle className="h-4 w-4 text-rose-300" />;
  }

  return <CircleDot className="h-4 w-4 text-slate-300" />;
}

export function EventTimeline({
  items,
  emptyTitle = 'Sin eventos',
  emptyDescription = 'No hay actividad registrada para este elemento.',
}: {
  items: EventTimelineItem[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ol className="space-y-4">
      {items.map((item, index) => (
        <li key={item.id} className="relative pl-10">
          {index < items.length - 1 ? <span className="absolute left-[17px] top-8 h-[calc(100%-10px)] w-px bg-slate-800" /> : null}
          <span className="absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300">
            {resolveIcon(item)}
          </span>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">{item.title}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{item.timestamp}</span>
                {item.status ? <StatusBadge status={item.status} /> : null}
              </div>
            </div>
            {item.description ? <p className="mt-2 text-sm text-slate-300">{item.description}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
