'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import type { Ticket, TicketCategory, TicketPriority } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

const CATEGORIES: TicketCategory[] = [
  'ELEVATOR',
  'PLUMBING',
  'ELECTRICAL',
  'SECURITY',
  'CLEANLINESS',
  'PARKING',
  'OTHER',
];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function NewTicket() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'OTHER' as TicketCategory,
    priority: 'MEDIUM' as TicketPriority,
    location: '',
  });

  const create = useMutation({
    mutationFn: () =>
      api<{ ticket: Ticket }>(`/api/societies/${slug}/tickets`, {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          priority: form.priority,
          ...(form.location ? { location: form.location } : {}),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets', slug] });
      router.push(`/s/${slug}/resident`);
    },
  });

  const valid = form.title.length >= 5 && form.description.length >= 10;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) create.mutate();
      }}
      className="max-w-lg flex flex-col gap-3"
    >
      <h1 className="text-xl font-semibold">Report an issue</h1>

      <Label>Title</Label>
      <Input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Short description (≥ 5 chars)"
      />

      <Label>Details</Label>
      <Textarea
        rows={4}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="When did it start? Any other context? (≥ 10 chars)"
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label>Category</Label>
          <Select
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as TicketCategory })
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Priority</Label>
          <Select
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: e.target.value as TicketPriority })
            }
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Label>Location (optional)</Label>
      <Input
        value={form.location}
        onChange={(e) => setForm({ ...form, location: e.target.value })}
        placeholder="3rd Floor / Block A Lobby"
      />

      {create.error && (
        <p className="text-sm text-red-600">{(create.error as Error).message}</p>
      )}

      <Button type="submit" disabled={create.isPending || !valid}>
        {create.isPending ? 'Submitting…' : 'Submit'}
      </Button>
    </form>
  );
}
