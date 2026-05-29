'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import type { Ticket, TicketStatus } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function AdminTicketDetail() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: ['ticket', slug, id],
    queryFn: () => api<{ ticket: Ticket }>(`/api/societies/${slug}/tickets/${id}`),
  });

  const ticket = data?.ticket;

  const [status, setStatus] = useState<TicketStatus>('OPEN');
  const [assignedTo, setAssignedTo] = useState('');
  const [internalNote, setInternalNote] = useState('');

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status);
      setAssignedTo(ticket.assignedTo ?? '');
      setInternalNote(ticket.internalNote ?? '');
    }
  }, [ticket]);

  const save = useMutation({
    mutationFn: () =>
      api<{ ticket: Ticket }>(`/api/societies/${slug}/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          assignedTo: assignedTo || null,
          internalNote: internalNote || null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', slug, id] });
      qc.invalidateQueries({ queryKey: ['tickets', slug] });
    },
  });

  if (isPending) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{(error as Error).message}</p>;
  if (!ticket) return <p className="text-sm text-neutral-500">Ticket not found</p>;

  return (
    <div className="max-w-2xl flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{ticket.title}</h1>
          <p className="text-xs text-neutral-500">
            {ticket.category} · {ticket.priority}
            {ticket.location ? ` · ${ticket.location}` : ''}
          </p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>
      <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-neutral-200">
        <div className="flex flex-col gap-1">
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Assigned to</Label>
          <Input
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Staff name"
          />
        </div>
        <div className="md:col-span-2 flex flex-col gap-1">
          <Label>Internal note</Label>
          <Textarea
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {save.error && (
        <p className="text-sm text-red-600">{(save.error as Error).message}</p>
      )}

      <div className="flex gap-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="ghost" onClick={() => router.push(`/s/${slug}/admin`)}>
          Back
        </Button>
      </div>
    </div>
  );
}
