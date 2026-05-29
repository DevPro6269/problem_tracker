'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import type { Ticket, TicketStatus } from '@/lib/types';
import TicketCard from '@/components/TicketCard';

const COLUMNS: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function AdminDashboard() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isPending, error } = useQuery({
    queryKey: ['tickets', slug, 'all'],
    queryFn: () =>
      api<{ tickets: Ticket[] }>(`/api/societies/${slug}/tickets`),
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {COLUMNS.map((status) => {
        const inCol = tickets.filter((t) => t.status === status);
        return (
          <section key={status} className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
              {status.replace('_', ' ')} ({inCol.length})
            </h2>
            <div className="flex flex-col gap-2">
              {inCol.map((t) => (
                <TicketCard key={t.id} ticket={t} href={`/s/${slug}/admin/tickets/${t.id}`} />
              ))}
              {inCol.length === 0 && (
                <p className="text-xs text-neutral-400 italic">None</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
