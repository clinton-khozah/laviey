import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import {
  findPathWithDifferentMethod,
  findRegisteredRoute,
} from '../services/routeRegistry.service.js';
import type { ApiErrorBody } from '../types/api.types.js';
import { isAppError } from '../utils/appError.js';

function normalizeApiPath(path: string): string {
  const prefix = env.API_PREFIX.replace(/\/$/, '');
  if (path.startsWith(prefix)) {
    return path.slice(prefix.length) || '/';
  }
  return path;
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    const body: ApiErrorBody = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request payload',
      details: error.flatten(),
    };
    res.status(400).json(body);
    return;
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'File must be 3 MB or smaller'
        : error.message;
    res.status(400).json({
      code: 'CONTENT_TOO_LARGE',
      message,
    } satisfies ApiErrorBody);
    return;
  }

  if (isAppError(error)) {
    const body: ApiErrorBody = {
      code: error.code,
      message: error.message,
      details: error.details,
    };
    res.status(error.statusCode).json(body);
    return;
  }

  console.error('Unhandled error:', error);

  const body: ApiErrorBody = {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong',
  };
  res.status(500).json(body);
}

export function notFoundHandler(req: Request, res: Response): void {
  const path = normalizeApiPath(req.path);
  const method = req.method.toUpperCase();
  const registered = findRegisteredRoute(method, path);
  const wrongMethod = findPathWithDifferentMethod(method, path);

  if (wrongMethod) {
    res.status(405).json({
      code: 'METHOD_NOT_ALLOWED',
      message: `Method ${method} is not allowed for ${path}. Expected ${wrongMethod.method}.`,
    } satisfies ApiErrorBody);
    return;
  }

  if (registered) {
    res.status(501).json({
      code: 'NOT_IMPLEMENTED',
      message: `Handler "${registered.handler_key}" is registered but not implemented yet.`,
    } satisfies ApiErrorBody);
    return;
  }

  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'This API path is not registered',
    details: { method, path },
  } satisfies ApiErrorBody);
}
