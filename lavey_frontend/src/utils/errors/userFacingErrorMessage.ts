import { ApiError } from '@/services/api/apiError';

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';
const SIGN_IN_AGAIN_MESSAGE = 'Please sign in again.';

export function isSessionExpiredMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('token is expired') ||
    lower.includes('token has expired') ||
    lower.includes('jwt expired') ||
    lower.includes('invalid claims') ||
    lower.includes('unable to parse or verify signature') ||
    lower.includes('invalid jwt')
  );
}

export function isAuthTokenMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    isSessionExpiredMessage(message) ||
    lower.includes('jwt') ||
    lower.includes('bearer') ||
    lower.includes('authorization token') ||
    lower.includes('invalid or expired token') ||
    lower.includes('invalid token') ||
    lower.includes('signature')
  );
}

export function isSignInRequiredMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('please sign in') ||
    lower.includes('sign in again') ||
    lower.includes('sign in to continue') ||
    lower.includes('session has expired') ||
    lower.includes('unauthorized')
  );
}

export function isSignInRequiredError(error: unknown): boolean {
  if (ApiError.isApiError(error)) {
    return error.status === 401 || error.code === 'UNAUTHORIZED' || error.code === 'SESSION_EXPIRED';
  }
  if (error instanceof Error) {
    return isSignInRequiredMessage(error.message);
  }
  return false;
}

export function sanitizeAuthErrorMessage(message: string): string {
  if (isSessionExpiredMessage(message)) {
    return SESSION_EXPIRED_MESSAGE;
  }
  if (isAuthTokenMessage(message)) {
    return SIGN_IN_AGAIN_MESSAGE;
  }
  return message;
}

export function getUserFacingErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (ApiError.isApiError(error)) {
    if (error.code === 'SESSION_EXPIRED') {
      return SESSION_EXPIRED_MESSAGE;
    }
    if (error.status === 401) {
      return sanitizeAuthErrorMessage(error.message);
    }
    return error.message;
  }

  if (error instanceof Error) {
    return sanitizeAuthErrorMessage(error.message);
  }

  return fallback;
}

export function isSessionExpiredError(error: unknown): boolean {
  if (ApiError.isApiError(error)) {
    return error.code === 'SESSION_EXPIRED' || error.status === 401;
  }
  if (error instanceof Error) {
    return isSessionExpiredMessage(error.message);
  }
  return false;
}

export { SESSION_EXPIRED_MESSAGE, SIGN_IN_AGAIN_MESSAGE };
