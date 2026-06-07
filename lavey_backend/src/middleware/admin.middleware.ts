import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { verifyAdminToken } from '../utils/adminJwt.js';
import { AppError } from '../utils/appError.js';

export interface AdminAuthenticatedRequest extends Request {
  admin?: {
    id: string;
    email: string;
    displayName: string;
  };
}

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export function requireAdmin(req: AdminAuthenticatedRequest, _res: Response, next: NextFunction): void {
  const bearer = readBearerToken(req);
  if (bearer) {
    try {
      const payload = verifyAdminToken(bearer);
      req.admin = {
        id: payload.sub,
        email: payload.email,
        displayName: payload.displayName,
      };
      next();
      return;
    } catch (error) {
      next(error);
      return;
    }
  }

  const legacyKey = req.headers['x-lavey-admin-key'];
  const provided = typeof legacyKey === 'string' ? legacyKey : '';

  if (provided && provided === env.ADMIN_API_SECRET) {
    req.admin = {
      id: 'legacy-service-key',
      email: 'service@lavey.internal',
      displayName: 'Service Key',
    };
    next();
    return;
  }

  next(new AppError(401, 'ADMIN_UNAUTHORIZED', 'Sign in to access the admin dashboard'));
}
