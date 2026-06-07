import { createHash } from 'crypto';
import { env } from '../config/env.js';
import { AppError } from './appError.js';

function salt(): string {
  return env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY;
}

export function normalizePhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    throw new AppError(400, 'INVALID_PHONE', 'Phone number must have 7–15 digits');
  }
  return digits;
}

export function hashPhone(raw: string): string {
  const digits = normalizePhoneDigits(raw);
  return createHash('sha256').update(`${digits}:${salt()}`).digest('hex');
}

export function hashPhones(rawPhones: string[]): string[] {
  const unique = new Set<string>();
  for (const raw of rawPhones) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      unique.add(hashPhone(trimmed));
    } catch {
      /* skip invalid entries */
    }
  }
  return [...unique];
}
