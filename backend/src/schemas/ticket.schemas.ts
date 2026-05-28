import { z } from 'zod';

export const TicketCategoryEnum = z.enum([
  'ELEVATOR',
  'PLUMBING',
  'ELECTRICAL',
  'SECURITY',
  'CLEANLINESS',
  'PARKING',
  'OTHER',
]);
export const TicketPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const TicketStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);

export const CreateTicketSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(10).max(2000),
  category: TicketCategoryEnum,
  priority: TicketPriorityEnum.optional(),
  location: z.string().max(100).optional(),
});

export const UpdateTicketSchema = z.object({
  status: TicketStatusEnum.optional(),
  assignedTo: z.string().max(100).nullable().optional(),
  internalNote: z.string().max(2000).nullable().optional(),
});

export type CreateTicketBody = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketBody = z.infer<typeof UpdateTicketSchema>;
