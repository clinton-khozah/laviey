import type { Request, Response } from 'express';
import { env } from '../config/env.js';

const COOKIE_NAME = 'lavey_oauth_frontend';

function getAllowedOrigins(): string[] {
  const fromCors = env.CORS_ORIGIN.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  try {
    const frontend = new URL(env.FRONTEND_URL).origin;
    if (!fromCors.includes(frontend)) {
      return [...fromCors, frontend];
    }
  } catch {
    /* ignore invalid FRONTEND_URL */
  }

  return fromCors;
}

function isAllowedFrontendOrigin(origin: string): boolean {
  if (getAllowedOrigins().includes(origin)) return true;
  return env.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(origin);
}

export function pickFrontendOrigin(candidate: string | undefined): string {
  if (!candidate) return env.FRONTEND_URL;

  try {
    const normalized = new URL(candidate).origin;
    if (isAllowedFrontendOrigin(normalized)) return normalized;

    if (env.NODE_ENV !== 'test') {
      console.warn(
        `[oauth] Frontend origin not allowed, using FRONTEND_URL: got=${normalized} allowed=${getAllowedOrigins().join(', ')}`,
      );
    }
    return env.FRONTEND_URL;
  } catch {
    return env.FRONTEND_URL;
  }
}

/** Referer / Origin when the browser navigates from the deployed SPA to /auth/google. */
export function inferFrontendOriginFromRequest(req: Request): string | undefined {
  const headerOrigin = req.headers.origin;
  if (typeof headerOrigin === 'string' && headerOrigin.length > 0) {
    return headerOrigin;
  }

  const referer = req.headers.referer;
  if (typeof referer === 'string' && referer.length > 0) {
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function buildGoogleOAuthCallbackUrl(frontendOrigin: string): string {
  const callback = new URL(env.GOOGLE_REDIRECT_URI);
  callback.searchParams.set('frontend', frontendOrigin);
  return callback.toString();
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
  const fromQuery =
    typeof req.query.frontend === 'string' ? req.query.frontend : undefined;
  if (fromQuery) {
    return pickFrontendOrigin(fromQuery);
  }

  const cookie = req.cookies?.[COOKIE_NAME];
  if (typeof cookie === 'string' && isAllowedFrontendOrigin(cookie)) {
    return cookie;
  }

  const inferred = inferFrontendOriginFromRequest(req);
  if (inferred) {
    return pickFrontendOrigin(inferred);
  }

  return env.FRONTEND_URL;
}

export function clearOAuthFrontendOrigin(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}
