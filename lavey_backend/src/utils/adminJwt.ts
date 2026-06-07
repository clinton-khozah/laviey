import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './appError.js';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  displayName: string;
}

const TOKEN_TTL = '7d';

export function signAdminToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, env.ADMIN_JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyAdminToken(token: string): AdminJwtPayload {
  try {
    const decoded = jwt.verify(token, env.ADMIN_JWT_SECRET);
    if (typeof decoded !== 'object' || decoded === null) {
      throw new Error('Invalid token payload');
    }
    const record = decoded as Record<string, unknown>;
    const sub = record.sub;
    const email = record.email;
    const displayName = record.displayName;

    if (typeof sub !== 'string' || typeof email !== 'string' || typeof displayName !== 'string') {
      throw new Error('Invalid token payload');
    }

    return { sub, email, displayName };
  } catch {
    throw new AppError(401, 'ADMIN_UNAUTHORIZED', 'Invalid or expired admin session');
  }
}
