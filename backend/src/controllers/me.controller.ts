import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import prisma from '../db/prisma.js';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: { message: 'Unauthenticated', status: 401 } });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!user) {
    res.status(404).json({ error: { message: 'User not found', status: 404 } });
    return;
  }
  res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      memberships: req.user.memberships,
    },
  });
});
