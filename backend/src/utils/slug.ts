import { randomBytes } from 'node:crypto';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Alphabet excludes look-alike chars (0/O, 1/I/L) for human-readable codes.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomChars(n: number): string {
  const bytes = randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

function prefixFor(slug: string): string {
  const parts = slug.split('-').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  const first = parts[0] ?? 'XX';
  return (first.slice(0, 2) || 'XX').toUpperCase().padEnd(2, 'X');
}

export function makeJoinCode(slug: string): string {
  return `${prefixFor(slug)}-${randomChars(4)}`;
}
