import Link from 'next/link';
import { MapPin, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from './StatusBadge';
import type { Ticket } from '@/lib/types';

type Props = { ticket: Ticket; href?: string };

const PRIORITY_DOT: Record<Ticket['priority'], string> = {
  LOW: 'bg-neutral-300',
  MEDIUM: 'bg-amber-400',
  HIGH: 'bg-orange-500',
  URGENT: 'bg-red-500',
};

export default function TicketCard({ ticket, href }: Props) {
  const body = (
    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 border-neutral-200/80">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[ticket.priority]}`}
              title={ticket.priority}
            />
            <div className="font-medium truncate">{ticket.title}</div>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="text-xs text-neutral-500 flex flex-wrap gap-2 items-center">
          <span className="rounded bg-neutral-100 px-1.5 py-0.5">{ticket.category}</span>
          {ticket.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {ticket.location}
            </span>
          )}
          {ticket.assignedTo && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {ticket.assignedTo}
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-700 line-clamp-2">{ticket.description}</p>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
