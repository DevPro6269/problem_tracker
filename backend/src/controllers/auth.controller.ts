import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import {
  AuthError,
  assertOtp,
  loginExisting,
  registerAdmin,
  registerResident,
} from '../services/authService.js';
import type {
  LoginBody,
  RegisterAdminBody,
  RegisterResidentBody,
} from '../schemas/auth.schemas.js';

function handle(e: unknown, res: Response): void {
  if (e instanceof AuthError) {
    res.status(e.status).json({ error: { message: e.message, status: e.status } });
    return;
  }
  if (e instanceof Error && /invalid phone/i.test(e.message)) {
    res.status(400).json({ error: { message: e.message, status: 400 } });
    return;
  }
  throw e;
}

export const sendOtp = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({ sent: true });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as LoginBody;
  try {
    assertOtp(body.otp);
    const out = await loginExisting(body.phone);
    res.status(200).json(out);
  } catch (e) {
    handle(e, res);
  }
});

export const registerAdminController = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as RegisterAdminBody;
  try {
    assertOtp(body.otp);
    const out = await registerAdmin(body);
    res.status(201).json(out);
  } catch (e) {
    handle(e, res);
  }
});

export const registerResidentController = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as RegisterResidentBody;
  try {
    assertOtp(body.otp);
    const out = await registerResident(body);
    res.status(201).json(out);
  } catch (e) {
    handle(e, res);
  }
});
