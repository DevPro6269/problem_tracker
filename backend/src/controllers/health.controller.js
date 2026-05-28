import prisma from '../db/prisma.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getHealth = asyncHandler(async (req, res) => {
  const payload = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: 'connected',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    payload.status = 'degraded';
    payload.db = 'disconnected';
    return res.status(503).json(payload);
  }

  return res.status(200).json(payload);
});
