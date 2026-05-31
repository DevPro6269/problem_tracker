import { z } from 'zod';

export const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
});

export type ChatBody = z.infer<typeof ChatSchema>;
