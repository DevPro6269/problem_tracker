'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Inbox, Loader2, CheckCircle2, Archive } from 'lucide-react';
import { api } from '@/lib/apiClient';
import type { Ticket, TicketStatus } from '@/lib/types';
import TicketCard from '@/components/TicketCard';

const COLUMNS: { status: TicketStatus; label: string; accent: string; icon: React.ReactNode }[] = [
  { status: 'OPEN', label: 'Open', accent: 'border-blue-300 bg-blue-50/30', icon: <Inbox className="h-3.5 w-3.5 text-blue-600" /> },
  { status: 'IN_PROGRESS', label: 'In progress', accent: 'border-amber-300 bg-amber-50/30', icon: <Loader2 className="h-3.5 w-3.5 text-amber-600" /> },
  { status: 'RESOLVED', label: 'Resolved', accent: 'border-emerald-300 bg-emerald-50/30', icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> },
  { status: 'CLOSED', label: 'Closed', accent: 'border-neutral-300 bg-neutral-100/40', icon: <Archive className="h-3.5 w-3.5 text-neutral-500" /> },
];

export default function AdminDashboard() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isPending, error } = useQuery({
    queryKey: ['tickets', slug, 'all'],
    queryFn: () => api<{ tickets: Ticket[] }>(`/api/societies/${slug}/tickets`),
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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-neutral-500">{tickets.length} ticket{tickets.length === 1 ? '' : 's'} total</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map(({ status, label, accent, icon }) => {
          const inCol = tickets.filter((t) => t.status === status);
          return (
            <section
              key={status}
              className={`flex flex-col gap-2 rounded-lg border ${accent} p-2`}
            >
              <h2 className="text-xs font-semibold text-neutral-700 uppercase tracking-wide flex items-center gap-1.5 px-1">
                {icon}
                {label}
                <span className="ml-auto rounded bg-white border border-neutral-200 px-1.5 text-neutral-600">
                  {inCol.length}
                </span>
              </h2>
              <div className="flex flex-col gap-2">
                {inCol.map((t) => (
                  <TicketCard key={t.id} ticket={t} href={`/s/${slug}/admin/tickets/${t.id}`} />
                ))}
                {inCol.length === 0 && (
                  <p className="text-xs text-neutral-400 italic px-1">None</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
