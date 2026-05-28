import { z } from 'zod';

const phone = z.string().min(5).max(20);
const otp = z.string().length(6);

export const SendOtpSchema = z.object({ phone });

export const LoginSchema = z.object({ phone, otp });

export const RegisterAdminSchema = z.object({
  phone,
  otp,
  name: z.string().min(1).max(100),
  societyName: z.string().min(2).max(120),
  address: z.string().max(300).optional(),
});

export const RegisterResidentSchema = z.object({
  phone,
  otp,
  name: z.string().min(1).max(100),
  flatNumber: z.string().min(1).max(20),
  joinCode: z.string().min(4).max(20),
});

export type SendOtpBody = z.infer<typeof SendOtpSchema>;
export type LoginBody = z.infer<typeof LoginSchema>;
export type RegisterAdminBody = z.infer<typeof RegisterAdminSchema>;
export type RegisterResidentBody = z.infer<typeof RegisterResidentSchema>;
