import type { NextFunction, Request, Response } from 'express';
import { getAuthUserFromAccessToken } from '../services/auth.service.js';
import { AppError } from '../utils/appError.js';
import { toUserFacingAuthMessage } from '../utils/sessionErrorMessage.js';

export interface AuthenticatedRequest extends Request {
  accessToken?: string;
  authUser?: Awaited<ReturnType<typeof getAuthUserFromAccessToken>>;
  file?: Express.Multer.File;
  files?:
    | {
        [fieldname: string]: Express.Multer.File[];
      }
    | Express.Multer.File[];
}

function extractBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue?.startsWith('Bearer ')) return null;
  const token = headerValue.slice('Bearer '.length).trim();
  return token || null;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Please sign in to continue.');
    }

    const user = await getAuthUserFromAccessToken(token);
    req.accessToken = token;
    req.authUser = user;
    next();
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      next(
        new AppError(401, error.code, toUserFacingAuthMessage(error.message)),
      );
      return;
    }
    next(error);
  }
}
