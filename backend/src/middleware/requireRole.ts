import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { MembershipClaim } from '../utils/jwt.js';

const requireRole =
  (role: MembershipClaim['role']): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.society) {
      res.status(401).json({ error: { message: 'Tenant not resolved', status: 401 } });
      return;
    }
    if (req.society.role !== role) {
      res.status(403).json({ error: { message: `${role} role required`, status: 403 } });
      return;
    }
    next();
  };

export default requireRole;
