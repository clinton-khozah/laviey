import { resolveErrorPageCode, type ErrorPageCode } from '@/features/errors';
import { ApiError } from '@/services/api/apiError';

const ERROR_PATH_PREFIX = '/error';

export interface ErrorPageState {
  code: ErrorPageCode;
  message?: string;
  apiCode?: string;
  status?: number;
}

export function buildErrorPath(state: ErrorPageState): string {
  const params = new URLSearchParams();
  if (state.message) params.set('message', state.message);
  if (state.apiCode) params.set('apiCode', state.apiCode);
  if (state.status) params.set('status', String(state.status));
  const query = params.toString();
  return `${ERROR_PATH_PREFIX}/${state.code}${query ? `?${query}` : ''}`;
}

export function navigateToErrorPage(state: ErrorPageState): void {
  const nextPath = buildErrorPath(state);
  if (window.location.pathname + window.location.search === nextPath) return;
  window.history.pushState(null, '', nextPath);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function parseErrorPagePath(pathname: string): ErrorPageCode | null {
  const match = pathname.match(/^\/error\/([a-z0-9]+)$/i);
  if (!match) return null;
  return match[1] as ErrorPageCode;
}

export function parseErrorPageSearch(search: string): {
  message?: string;
  apiCode?: string;
  status?: number;
} {
  const params = new URLSearchParams(search);
  const statusRaw = params.get('status');
  return {
    message: params.get('message') ?? undefined,
    apiCode: params.get('apiCode') ?? undefined,
    status: statusRaw ? Number(statusRaw) : undefined,
  };
}

export function maybeNavigateToErrorPage(error: ApiError): void {
  if (
    error.code === 'EMAIL_CONFIRMATION_REQUIRED' ||
    error.code === 'EMAIL_VERIFICATION_FAILED' ||
    error.code === 'EMAIL_RESEND_FAILED' ||
    error.code === 'EMAIL_SIGN_IN_FAILED' ||
    error.code === 'EMAIL_SIGN_UP_FAILED' ||
    error.code === 'EMAIL_RATE_LIMIT' ||
    error.code === 'VALIDATION_ERROR' ||
    error.code === 'POST_NOT_FOUND' ||
    error.code === 'POST_DELETE_FAILED' ||
    error.code === 'POST_UPDATE_FAILED' ||
    error.code === 'POST_LIMIT_REACHED' ||
    error.code === 'POSTS_READ_FAILED' ||
    error.code === 'CONTENT_UPLOAD_FAILED' ||
    error.code === 'CONTENT_DELETE_FAILED' ||
    error.code === 'ADMIN_COUNT_FAILED' ||
    error.code === 'ADMIN_REGISTER_FAILED' ||
    error.code === 'ADMIN_LOGIN_FAILED' ||
    error.code === 'ADMIN_REGISTER_FORBIDDEN' ||
    error.code === 'ADMIN_EMAIL_EXISTS' ||
    error.code === 'ADMIN_INVALID_CREDENTIALS' ||
    error.code === 'ADMIN_DATA_UNAVAILABLE' ||
    error.code === 'ADMIN_UNAUTHORIZED' ||
    error.code === 'SESSION_EXPIRED' ||
    error.code === 'UNAUTHORIZED' ||
    error.code === 'MEETING_TRANSCRIPT_FAILED' ||
    error.code === 'MEETING_TRANSCRIPT_FORMAT' ||
    error.code === 'MEETING_TRANSCRIPT_EMPTY' ||
    error.code === 'MEETING_TRANSLATE_FAILED' ||
    error.code === 'PUSH_NOT_CONFIGURED'
  ) {
    return;
  }

  const shouldShowPage =
    error.code === 'NOT_FOUND' ||
    error.code === 'NOT_IMPLEMENTED' ||
    error.code === 'METHOD_NOT_ALLOWED' ||
    error.status === 403 ||
    error.status === 405 ||
    error.status === 501 ||
    error.status >= 500;

  if (!shouldShowPage) return;

  navigateToErrorPage({
    code: resolveErrorPageCode(error.status, error.code),
    message: error.message,
    apiCode: error.code,
    status: error.status,
  });
}
