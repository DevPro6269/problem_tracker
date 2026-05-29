'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import type { Ticket } from '@/lib/types';
import TicketCard from '@/components/TicketCard';
import { Button } from '@/components/ui/button';

export default function ResidentList() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isPending, error } = useQuery({
    queryKey: ['tickets', slug, 'mine'],
    queryFn: () =>
      api<{ tickets: Ticket[] }>(`/api/societies/${slug}/tickets/mine`),
  });

  if (isPending) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (error) {
    return (
      <p className="text-sm text-red-600">
        Failed to load: {(error as Error).message}
      </p>
    );
  }

  const tickets = data?.tickets ?? [];

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 flex flex-col items-center gap-4">
        <p className="text-neutral-600">No issues yet.</p>
        <Button asChild>
          <Link href={`/s/${slug}/resident/tickets/new`}>Report your first issue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {tickets.map((t) => (
        <TicketCard key={t.id} ticket={t} />
      ))}
    </div>
  );
}
