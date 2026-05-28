import type { MembershipClaim, SessionPayload } from '../utils/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: SessionPayload;
      society?: {
        id: string;
        slug: string;
        role: MembershipClaim['role'];
      };
    }
  }
}

export {};
