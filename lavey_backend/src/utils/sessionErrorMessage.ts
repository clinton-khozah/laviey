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
    lower.includes('invalid token')
  );
}

export function toUserFacingAuthMessage(message: string, expired = isSessionExpiredMessage(message)): string {
  if (expired || isSessionExpiredMessage(message)) {
    return SESSION_EXPIRED_MESSAGE;
  }
  if (isAuthTokenMessage(message)) {
    return SIGN_IN_AGAIN_MESSAGE;
  }
  return message;
}

export { SESSION_EXPIRED_MESSAGE, SIGN_IN_AGAIN_MESSAGE };
