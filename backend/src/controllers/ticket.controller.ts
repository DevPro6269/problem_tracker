import type { Request, Response } from 'express';
import type { TicketCategory, TicketStatus } from '@prisma/client';
import asyncHandler from '../utils/asyncHandler.js';
import {
  createTicket,
  listSocietyTickets,
  listMyTickets,
  getTicket,
  updateTicket,
} from '../services/ticketService.js';
import type { CreateTicketBody, UpdateTicketBody } from '../schemas/ticket.schemas.js';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await createTicket(
    req.society!.id,
    req.user!.userId,
    req.body as CreateTicketBody,
  );
  res.status(201).json({ ticket });
});

export const listAll = asyncHandler(async (req: Request, res: Response) => {
  const statusParam = (req.query.status as string | undefined)
    ?.split(',')
    .filter(Boolean) as TicketStatus[] | undefined;
  const categoryParam = req.query.category as TicketCategory | undefined;
  const tickets = await listSocietyTickets(req.society!.id, {
    status: statusParam,
    category: categoryParam,
  });
  res.json({ tickets });
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const tickets = await listMyTickets(req.society!.id, req.user!.userId);
  res.json({ tickets });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (typeof id !== 'string' || !id) {
    res.status(400).json({ error: { message: 'Missing ticket id', status: 400 } });
    return;
  }
  const t = await getTicket(req.society!.id, id);
  if (!t) {
    res.status(404).json({ error: { message: 'Ticket not found', status: 404 } });
    return;
  }
  // residents can only see their own tickets
  if (req.society!.role === 'RESIDENT' && t.createdById !== req.user!.userId) {
    res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    return;
  }
  res.json({ ticket: t });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (typeof id !== 'string' || !id) {
    res.status(400).json({ error: { message: 'Missing ticket id', status: 400 } });
    return;
  }
  const t = await updateTicket(req.society!.id, id, req.body as UpdateTicketBody);
  if (!t) {
    res.status(404).json({ error: { message: 'Ticket not found', status: 404 } });
    return;
  }
  res.json({ ticket: t });
});
