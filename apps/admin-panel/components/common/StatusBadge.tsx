import { Badge } from '../ui/badge';

const SUCCESS = new Set(['active', 'approved', 'paid', 'completed', 'verified', 'resolved', 'ok']);
const WARNING = new Set(['pending', 'in_progress', 'processing', 'review', 'created', 'queued']);
const DANGER = new Set(['blocked', 'suspended', 'failed', 'rejected', 'canceled', 'cancelled', 'error']);
const INFO = new Set(['open', 'assigned', 'retrying', 'refunded']);

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const value = (status ?? 'unknown').toString();
  const normalized = value.toLowerCase();

  let variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';

  if (SUCCESS.has(normalized)) variant = 'success';
  else if (WARNING.has(normalized)) variant = 'warning';
  else if (DANGER.has(normalized)) variant = 'danger';
  else if (INFO.has(normalized)) variant = 'info';

  return (
    <Badge variant={variant} className="capitalize tracking-wide">
      {value.replaceAll('_', ' ')}
    </Badge>
  );
}
