import { z } from 'zod';
import { LlmAgent, FunctionTool, InMemoryRunner } from '@google/adk';
import type { Context as ToolContext } from '@google/adk';
import prisma from '../db/prisma.js';
import type { TicketCategory, TicketPriority } from '@prisma/client';

// Tools read userId + societyId from session state, which we seed per-request
// via stateDelta in chatService.ts.

function ctxIds(toolContext: ToolContext | undefined): { userId: string; societyId: string } {
  const userId = toolContext?.state.get<string>('userId');
  const societyId = toolContext?.state.get<string>('societyId');
  if (typeof userId !== 'string' || typeof societyId !== 'string') {
    throw new Error('Tool called without userId/societyId in session state');
  }
  return { userId, societyId };
}

const createTicket = new FunctionTool({
  name: 'create_ticket',
  description:
    'File a new complaint ticket for the current resident. Infer a concise title, clear description, category, priority, and location from the resident message whenever possible. Returns the new ticket id.',
  parameters: z.object({
    title: z.string().min(5).max(120).describe('Short title, 5-120 chars'),
    description: z
      .string()
      .min(10)
      .max(2000)
      .describe('Detailed description of the issue, 10-2000 chars'),
    category: z
      .enum(['ELEVATOR', 'PLUMBING', 'ELECTRICAL', 'SECURITY', 'CLEANLINESS', 'PARKING', 'OTHER'])
      .describe('Category of the issue'),
    priority: z
      .enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
      .describe('How urgent the issue is'),
    location: z
      .string()
      .max(100)
      .optional()
      .describe('Where in the building, e.g. "3rd Floor", "Block A Lobby"'),
  }),
  execute: async (input, toolContext) => {
    const { userId, societyId } = ctxIds(toolContext);
    const ticket = await prisma.ticket.create({
      data: {
        societyId,
        createdById: userId,
        title: input.title,
        description: input.description,
        category: input.category as TicketCategory,
        priority: input.priority as TicketPriority,
        location: input.location ?? null,
      },
    });
    return {
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
    };
  },
});

const listMyTickets = new FunctionTool({
  name: 'list_my_tickets',
  description:
    'Return the calling resident’s own tickets in this society. Use when the user asks about status or history of their issues.',
  parameters: z.object({}),
  execute: async (_input, toolContext) => {
    const { userId, societyId } = ctxIds(toolContext);
    const tickets = await prisma.ticket.findMany({
      where: { societyId, createdById: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return {
      tickets: tickets.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        priority: t.priority,
        status: t.status,
        location: t.location,
        assignedTo: t.assignedTo,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    };
  },
});

const INSTRUCTION = `You are a friendly assistant for SocietyDesk, a multi-tenant complaint portal for residential housing societies.

The user is a RESIDENT. Help them with two things:

1. FILING A NEW COMPLAINT
   - First understand the resident's intent. They may write casually, with spelling mistakes, Hinglish, Hindi, or short messages.
   - Mirror the resident's language and tone. If they write in Hindi/Hinglish, reply in Hindi/Hinglish. If they write in English, reply in English.
   - Do not force the resident to provide a title or description. Create these yourself from the user's message.
   - Build a short, admin-friendly title: 5-120 characters, specific, no extra punctuation.
   - Build a useful description: include what happened, where it happened, severity/urgency, and any timing details the resident gave. Do not invent facts.
   - Infer category from intent:
     * lift/elevator not working, stuck, noise -> ELEVATOR
     * water leak, tap, pipe, drainage, toilet, seepage -> PLUMBING
     * lights, power, wiring, fan, switch, meter -> ELECTRICAL
     * guard, gate, CCTV, stranger, theft, safety -> SECURITY
     * garbage, smell, sweeping, dirty area, pests -> CLEANLINESS
     * parking slot, vehicle blocking, basement parking -> PARKING
     * unclear or not covered -> OTHER
   - Infer priority:
     * URGENT for safety risk, fire/sparks, person stuck, flooding, security threat, total lift failure with trapped person.
     * HIGH for active leaks, power issues affecting common areas, blocked access, repeated lift failure.
     * MEDIUM for normal maintenance issues that need attention soon.
     * LOW for minor, cosmetic, or non-urgent issues.
   - Infer location when present. If no exact location is given but the issue is still actionable, use no location instead of asking.
   - Ask only one short clarifying question when the issue cannot be filed safely without it, such as "Where is this happening?" for a location-dependent complaint.
   - If the complaint already has enough information, CALL create_ticket immediately. Do not ask the user to confirm the title/description first.
   - When you have enough, CALL create_ticket. After the tool returns, briefly confirm what you filed and share the ticket id.

2. CHECKING THE STATUS OF THEIR EXISTING TICKETS
   - When the user asks about their existing issues, CALL list_my_tickets and answer concisely based on the real data.
   - Never invent ticket ids, statuses, or assignees. Use real tool results only.

Style:
- Be warm, brief, and conversational. Match the user's language (English, Hindi, or Hindi/English mix).
- Use natural resident-facing wording, not technical language. Avoid saying "I inferred" unless the user asks.
- Don't lecture. Don't repeat the user.
- If the user asks something you can't help with (e.g. another society, payments, account changes), politely say so.
- Categories you support: Elevator, Plumbing, Electrical, Security, Cleanliness, Parking, Other.
- Priorities: Low, Medium, High, Urgent.

Examples:
- User: "bhai A block ke 3rd floor pe pipe se pani leak ho raha hai"
  Action: create_ticket with title "Water leak on A Block 3rd floor", category PLUMBING, priority HIGH, location "A Block, 3rd floor". Reply in Hinglish/Hindi.
- User: "lift not working since morning"
  Action: create_ticket with title "Lift not working since morning", category ELEVATOR, priority HIGH. Ask location only if the society has multiple lifts and the message is too ambiguous.
- User: "parking me ek car meri slot block kar rahi hai"
  Action: create_ticket with title "Car blocking resident parking slot", category PARKING, priority MEDIUM.`;

// gemini-2.5-flash-lite has a separate (and more generous) free-tier pool
// than the main -flash models, which keeps the demo running without billing.
export const intakeAgent = new LlmAgent({
  name: 'intake_agent',
  model: 'gemini-2.5-flash-lite',
  instruction: INSTRUCTION,
  tools: [createTicket, listMyTickets],
});

export const intakeRunner = new InMemoryRunner({
  agent: intakeAgent,
  appName: 'societydesk',
});
