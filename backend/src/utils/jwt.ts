import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export type MembershipClaim = {
  societyId: string;
  slug: string;
  role: 'ADMIN' | 'RESIDENT';
};

export type SessionPayload = {
  userId: string;
  memberships: MembershipClaim[];
};

const EXPIRY = '7d';

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, config.jwtSecret, { algorithm: 'HS256', expiresIn: EXPIRY });
}

export function verifySession(token: string): SessionPayload {
  const decoded = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload & SessionPayload;
  if (!decoded.userId || !Array.isArray(decoded.memberships)) {
    throw new Error('Invalid session payload');
  }
  return { userId: decoded.userId, memberships: decoded.memberships };
}
