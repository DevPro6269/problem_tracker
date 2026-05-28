import type { Request, Response } from 'express';
import prisma from '../db/prisma.js';
import asyncHandler from '../utils/asyncHandler.js';

interface HealthPayload {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  db: 'connected' | 'disconnected';
}

export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const payload: HealthPayload = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: 'connected',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    payload.status = 'degraded';
    payload.db = 'disconnected';
    return res.status(503).json(payload);
  }

  return res.status(200).json(payload);
});
