export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function validatePhone(phone: string): string | null {
  const value = phone.trim();
  if (!value) return 'Phone number is required.';
  if (value.length < 8 || value.length > 20) return 'Enter a valid phone number.';
  if (!/^\+?[0-9][0-9\s-]*$/.test(value)) return 'Use digits, spaces, hyphens, and an optional +.';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return 'Enter a valid phone number.';
  return null;
}

export function validateOtp(otp: string): string | null {
  if (!otp.trim()) return 'OTP is required.';
  if (!/^\d{6}$/.test(otp)) return 'OTP must be exactly 6 digits.';
  return null;
}

export function required(value: string, label: string): string | null {
  return value.trim() ? null : `${label} is required.`;
}

export function lengthBetween(
  value: string,
  label: string,
  min: number,
  max: number,
): string | null {
  const length = value.trim().length;
  if (length < min) return `${label} must be at least ${min} characters.`;
  if (length > max) return `${label} must be ${max} characters or less.`;
  return null;
}

export function maxLength(value: string, label: string, max: number): string | null {
  return value.trim().length > max ? `${label} must be ${max} characters or less.` : null;
}
