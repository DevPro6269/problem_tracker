import { Badge } from '@/components/ui/badge';
import type { TicketStatus } from '@/lib/types';

const COLORS: Record<TicketStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-neutral-200 text-neutral-700',
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge className={COLORS[status]}>{status.replace('_', ' ')}</Badge>;
}
