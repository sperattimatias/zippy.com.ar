import { Badge } from '../ui/badge';

const SUCCESS = new Set(['active', 'approved', 'paid', 'completed', 'verified', 'resolved', 'ok', 'open']);
const WARNING = new Set(['pending', 'in_progress', 'processing', 'review', 'created']);
const DANGER = new Set(['blocked', 'suspended', 'failed', 'rejected', 'refunded', 'canceled', 'cancelled']);

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const value = (status ?? 'unknown').toString();
  const normalized = value.toLowerCase();

  let variant: 'success' | 'outline' | 'danger' = 'outline';
  if (SUCCESS.has(normalized)) variant = 'success';
  if (WARNING.has(normalized)) variant = 'outline';
  if (DANGER.has(normalized)) variant = 'danger';
  if (normalized === 'cancelled' || normalized === 'canceled') variant = 'outline';

  return <Badge variant={variant}>{value}</Badge>;
}
