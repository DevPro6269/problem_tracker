'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
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

  if (isPending) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{(error as Error).message}</p>;
  if (!ticket) return <p className="text-sm text-neutral-500">Ticket not found</p>;

  return (
    <TicketEditor
      key={`${ticket.id}-${ticket.updatedAt}`}
      ticket={ticket}
      onBack={() => router.push(`/s/${slug}/admin`)}
      onSave={(body) =>
        api<{ ticket: Ticket }>(`/api/societies/${slug}/tickets/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      }
      onSaved={() => {
        qc.invalidateQueries({ queryKey: ['ticket', slug, id] });
        qc.invalidateQueries({ queryKey: ['tickets', slug] });
      }}
    />
  );
}

function TicketEditor({
  ticket,
  onBack,
  onSave,
  onSaved,
}: {
  ticket: Ticket;
  onBack: () => void;
  onSave: (body: {
    status: TicketStatus;
    assignedTo: string | null;
    internalNote: string | null;
  }) => Promise<{ ticket: Ticket }>;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [assignedTo, setAssignedTo] = useState(ticket.assignedTo ?? '');
  const [internalNote, setInternalNote] = useState(ticket.internalNote ?? '');

  const save = useMutation({
    mutationFn: () =>
      onSave({
        status,
        assignedTo: assignedTo.trim() || null,
        internalNote: internalNote.trim() || null,
      }),
    onSuccess: onSaved,
  });

  return (
    <div className="max-w-3xl rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#26352b] text-white">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">{ticket.title}</h1>
            <p className="mt-1 text-xs text-neutral-500">
              {ticket.category.replace('_', ' ')} · {ticket.priority}
              {ticket.location ? ` · ${ticket.location}` : ''}
            </p>
          </div>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <p className="text-sm whitespace-pre-wrap text-neutral-700">{ticket.description}</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-neutral-200 pt-5 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-status">Status</Label>
          <Select
            id="ticket-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TicketStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assigned-to">Assigned to</Label>
          <Input
            id="assigned-to"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Staff name"
          />
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label htmlFor="internal-note">Internal note</Label>
          <Textarea
            id="internal-note"
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            rows={4}
            placeholder="Add handover notes, vendor updates, or follow-up details."
          />
          <p className="text-xs text-neutral-500">Only admins can see internal notes.</p>
        </div>
      </div>

      {save.error && <p className="mt-4 text-sm text-red-600">{(save.error as Error).message}</p>}

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-neutral-200 pt-4 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
