import { Badge } from '@/components/ui/badge';
import type { TicketStatus } from '@/lib/types';

const COLORS: Record<TicketStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-800 border border-blue-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 border border-amber-200',
  RESOLVED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  CLOSED: 'bg-neutral-200 text-neutral-700 border border-neutral-300',
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge className={COLORS[status]}>{status.replace('_', ' ')}</Badge>;
}
