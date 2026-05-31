import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { chat } from '../services/chatService.js';
import type { ChatBody } from '../schemas/chat.schemas.js';

export const postChat = asyncHandler(async (req: Request, res: Response) => {
  if (req.society!.role !== 'RESIDENT') {
    res.status(403).json({ error: { message: 'RESIDENT role required', status: 403 } });
    return;
  }
  const body = req.body as ChatBody;
  const result = await chat(req.user!.userId, req.society!.id, body.message);
  res.json(result);
});
