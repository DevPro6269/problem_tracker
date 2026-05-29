import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from './StatusBadge';
import type { Ticket } from '@/lib/types';

type Props = { ticket: Ticket; href?: string };

export default function TicketCard({ ticket, href }: Props) {
  const body = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium">{ticket.title}</div>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="text-xs text-neutral-500">
          {ticket.category} · {ticket.priority}
          {ticket.location ? ` · ${ticket.location}` : ''}
        </div>
        <p className="text-sm text-neutral-700 line-clamp-2">{ticket.description}</p>
        {ticket.assignedTo && (
          <p className="text-xs text-neutral-500">Assigned to: {ticket.assignedTo}</p>
        )}
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
