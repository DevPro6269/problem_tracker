'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { api } from '@/lib/apiClient';
import type { Ticket, TicketCategory, TicketPriority } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { type FieldErrors, lengthBetween, maxLength } from '@/lib/validation';

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
type TicketField = 'title' | 'description' | 'location';

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
  const [errors, setErrors] = useState<FieldErrors<TicketField>>({});

  function updateField(field: TicketField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validateForm(): boolean {
    const next: FieldErrors<TicketField> = {};
    next.title = lengthBetween(form.title, 'Title', 5, 120) ?? undefined;
    next.description = lengthBetween(form.description, 'Details', 10, 2000) ?? undefined;
    next.location = form.location
      ? (maxLength(form.location, 'Location', 100) ?? undefined)
      : undefined;

    setErrors(next);
    return !Object.values(next).some(Boolean);
  }

  const create = useMutation({
    mutationFn: () =>
      api<{ ticket: Ticket }>(`/api/societies/${slug}/tickets`, {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          priority: form.priority,
          ...(form.location.trim() ? { location: form.location.trim() } : {}),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets', slug] });
      router.push(`/s/${slug}/resident`);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!validateForm()) return;
        create.mutate();
      }}
      className="max-w-2xl rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#26352b] text-white">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">Report an issue</h1>
          <p className="text-sm text-neutral-600">
            Add enough detail so the admin team can assign it without asking again.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-title">Title</Label>
          <Input
            id="ticket-title"
            value={form.title}
            aria-invalid={!!errors.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Water leakage near A-302"
          />
          {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-description">Details</Label>
          <Textarea
            id="ticket-description"
            rows={5}
            value={form.description}
            aria-invalid={!!errors.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="When did it start? How severe is it? Add anything the staff should know."
          />
          {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-category">Category</Label>
            <Select
              id="ticket-category"
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as TicketCategory })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-priority">Priority</Label>
            <Select
              id="ticket-priority"
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-location">Location (optional)</Label>
          <Input
            id="ticket-location"
            value={form.location}
            aria-invalid={!!errors.location}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="3rd Floor / Block A Lobby"
          />
          {errors.location && <p className="text-sm text-red-600">{errors.location}</p>}
        </div>

        {create.error && (
          <p className="text-sm text-red-600">{(create.error as Error).message}</p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-neutral-200 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => router.push(`/s/${slug}/resident`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Submitting…' : 'Submit issue'}
          </Button>
        </div>
      </div>
    </form>
  );
}
