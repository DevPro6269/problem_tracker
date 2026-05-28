import { Role } from '@prisma/client';
import prisma from '../db/prisma.js';
import { normalizePhone } from '../utils/phone.js';
import { slugify, makeJoinCode } from '../utils/slug.js';
import { signSession, type MembershipClaim } from '../utils/jwt.js';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const DEMO_OTP = '123456';

export function assertOtp(otp: string): void {
  if (otp !== DEMO_OTP) {
    throw new AuthError('Invalid OTP', 401);
  }
}

async function membershipsFor(userId: string): Promise<MembershipClaim[]> {
  const rows = await prisma.societyMember.findMany({
    where: { userId },
    include: { society: { select: { slug: true } } },
  });
  return rows.map((m) => ({
    societyId: m.societyId,
    slug: m.society.slug,
    role: m.role as 'ADMIN' | 'RESIDENT',
  }));
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base || 'society';
  for (let i = 0; i < 4; i++) {
    const exists = await prisma.society.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  throw new AuthError('Could not allocate a unique slug', 500);
}

async function uniqueJoinCode(slug: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = makeJoinCode(slug);
    const exists = await prisma.society.findUnique({ where: { joinCode: code } });
    if (!exists) return code;
  }
  throw new AuthError('Could not allocate a unique join code', 500);
}

async function issueSession(userId: string, name: string, phone: string) {
  const memberships = await membershipsFor(userId);
  const token = signSession({ userId, memberships });
  return { token, user: { id: userId, name, phone, memberships } };
}

export async function registerAdmin(input: {
  phone: string;
  name: string;
  societyName: string;
  address?: string;
}) {
  const phone = normalizePhone(input.phone);
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new AuthError('Phone already registered', 409);

  const baseSlug = slugify(input.societyName);
  const slug = await uniqueSlug(baseSlug);
  const joinCode = await uniqueJoinCode(slug);

  const { user } = await prisma.$transaction(async (tx) => {
    const society = await tx.society.create({
      data: { name: input.societyName, slug, joinCode, address: input.address ?? null },
    });
    const user = await tx.user.create({ data: { phone, name: input.name } });
    await tx.societyMember.create({
      data: { userId: user.id, societyId: society.id, role: Role.ADMIN },
    });
    return { user, society };
  });

  return issueSession(user.id, user.name, user.phone);
}

export async function registerResident(input: {
  phone: string;
  name: string;
  flatNumber: string;
  joinCode: string;
}) {
  const phone = normalizePhone(input.phone);
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new AuthError('Phone already registered', 409);

  const society = await prisma.society.findUnique({ where: { joinCode: input.joinCode } });
  if (!society) throw new AuthError('Invalid join code', 404);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { phone, name: input.name } });
    await tx.societyMember.create({
      data: {
        userId: u.id,
        societyId: society.id,
        role: Role.RESIDENT,
        flatNumber: input.flatNumber,
      },
    });
    return u;
  });

  return issueSession(user.id, user.name, user.phone);
}

export async function loginExisting(phoneRaw: string) {
  const phone = normalizePhone(phoneRaw);
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new AuthError('No account found for this phone', 404);
  return issueSession(user.id, user.name, user.phone);
}
