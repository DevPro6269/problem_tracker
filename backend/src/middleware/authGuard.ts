import type { Request, Response, NextFunction } from 'express';
import { verifySession } from '../utils/jwt.js';

const authGuard = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({
      error: { message: 'Missing or malformed Authorization header', status: 401 },
    });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.user = verifySession(token);
    next();
  } catch {
    res.status(401).json({ error: { message: 'Invalid or expired token', status: 401 } });
  }
};

export default authGuard;
