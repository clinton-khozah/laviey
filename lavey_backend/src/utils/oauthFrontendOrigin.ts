import type { Request, Response } from 'express';
import { env } from '../config/env.js';

const COOKIE_NAME = 'lavey_oauth_frontend';

function getAllowedOrigins(): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isAllowedFrontendOrigin(origin: string): boolean {
  if (getAllowedOrigins().includes(origin)) return true;
  return env.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(origin);
}

export function pickFrontendOrigin(candidate: string | undefined): string {
  if (!candidate) return env.FRONTEND_URL;

  try {
    const normalized = new URL(candidate).origin;
    return isAllowedFrontendOrigin(normalized) ? normalized : env.FRONTEND_URL;
  } catch {
    return env.FRONTEND_URL;
  }
}

export function stashOAuthFrontendOrigin(res: Response, origin: string): void {
  res.cookie(COOKIE_NAME, origin, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/',
  });
}

export function readOAuthFrontendOrigin(req: Request): string {
  const cookie = req.cookies?.[COOKIE_NAME];
  if (typeof cookie === 'string' && isAllowedFrontendOrigin(cookie)) {
    return cookie;
  }
  return env.FRONTEND_URL;
}

export function clearOAuthFrontendOrigin(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}
