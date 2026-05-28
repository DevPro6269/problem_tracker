import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export function normalizePhone(input: string, defaultCountry: CountryCode = 'IN'): string {
  const parsed = parsePhoneNumberFromString(input, defaultCountry);
  if (!parsed || !parsed.isValid()) {
    throw new Error(`Invalid phone number: ${input}`);
  }
  return parsed.number;
}
