import type { TicketCategory, TicketStatus } from '@prisma/client';
import prisma from '../db/prisma.js';
import type { CreateTicketBody, UpdateTicketBody } from '../schemas/ticket.schemas.js';

export function createTicket(
  societyId: string,
  createdById: string,
  body: CreateTicketBody,
) {
  return prisma.ticket.create({
    data: {
      societyId,
      createdById,
      title: body.title,
      description: body.description,
      category: body.category as TicketCategory,
      priority: body.priority ?? 'MEDIUM',
      location: body.location ?? null,
    },
  });
}

export function listSocietyTickets(
  societyId: string,
  filters: { status?: TicketStatus[]; category?: TicketCategory } = {},
) {
  return prisma.ticket.findMany({
    where: {
      societyId,
      ...(filters.status?.length ? { status: { in: filters.status } } : {}),
      ...(filters.category ? { category: filters.category } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export function listMyTickets(societyId: string, userId: string) {
  return prisma.ticket.findMany({
    where: { societyId, createdById: userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTicket(societyId: string, ticketId: string) {
  const t = await prisma.ticket.findUnique({ where: { id: ticketId } });
  return t && t.societyId === societyId ? t : null;
}

export async function updateTicket(
  societyId: string,
  ticketId: string,
  body: UpdateTicketBody,
) {
  const existing = await getTicket(societyId, ticketId);
  if (!existing) return null;
  return prisma.ticket.update({ where: { id: ticketId }, data: body });
}
