import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import prisma from '../db/prisma.js';

export const getSociety = asyncHandler(async (req: Request, res: Response) => {
  const society = await prisma.society.findUnique({ where: { id: req.society!.id } });
  if (!society) {
    res.status(404).json({ error: { message: 'Society not found', status: 404 } });
    return;
  }
  const base = {
    id: society.id,
    name: society.name,
    slug: society.slug,
    address: society.address,
    createdAt: society.createdAt,
  };
  const payload =
    req.society!.role === 'ADMIN' ? { ...base, joinCode: society.joinCode } : base;
  res.json({ society: payload, role: req.society!.role });
});
