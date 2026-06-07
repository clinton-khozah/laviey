export type ErrorPageCode =
  | '400'
  | '401'
  | '403'
  | '404'
  | '405'
  | '500'
  | '501'
  | '503'
  | 'offline'
  | 'generic';

export interface ErrorPageContent {
  code: ErrorPageCode;
  status: number;
  title: string;
  headline: string;
  message: string;
  emoji: string;
  primaryAction: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}

export const ERROR_PAGE_CONTENT: Record<ErrorPageCode, ErrorPageContent> = {
  '400': {
    code: '400',
    status: 400,
    title: 'Bad request',
    headline: 'Something was off',
    message: 'The request could not be understood. Check your input and try again.',
    emoji: '⚠️',
    primaryAction: { label: 'Go home', href: '/' },
    secondaryAction: { label: 'Try again', href: 'back' },
  },
  '401': {
    code: '401',
    status: 401,
    title: 'Sign in required',
    headline: 'You need to sign in',
    message: 'This page is only available when you are logged in.',
    emoji: '🔐',
    primaryAction: { label: 'Sign in', href: '/' },
  },
  '403': {
    code: '403',
    status: 403,
    title: 'Access denied',
    headline: 'No access here',
    message: 'You do not have permission to view this resource.',
    emoji: '🚫',
    primaryAction: { label: 'Go home', href: '/' },
  },
  '404': {
    code: '404',
    status: 404,
    title: 'Not found',
    headline: 'Page not found',
    message: '',
    emoji: '🧭',
    primaryAction: { label: 'Go home', href: '/' },
    secondaryAction: { label: 'Go back', href: 'back' },
  },
  '405': {
    code: '405',
    status: 405,
    title: 'Method not allowed',
    headline: 'Wrong approach',
    message: 'This endpoint does not support that HTTP method.',
    emoji: '🛑',
    primaryAction: { label: 'Go home', href: '/' },
  },
  '500': {
    code: '500',
    status: 500,
    title: 'Server error',
    headline: 'We hit a snag',
    message: 'Something went wrong on our side. Please try again in a moment.',
    emoji: '💫',
    primaryAction: { label: 'Try again', href: 'reload' },
    secondaryAction: { label: 'Go home', href: '/' },
  },
  '501': {
    code: '501',
    status: 501,
    title: 'Coming soon',
    headline: 'Not wired up yet',
    message: 'This API path is registered but the handler is not implemented yet.',
    emoji: '🛠️',
    primaryAction: { label: 'Go home', href: '/' },
  },
  '503': {
    code: '503',
    status: 503,
    title: 'Unavailable',
    headline: 'Be right back',
    message: 'The service is temporarily unavailable. Please try again shortly.',
    emoji: '⏳',
    primaryAction: { label: 'Try again', href: 'reload' },
  },
  offline: {
    code: 'offline',
    status: 0,
    title: 'Offline',
    headline: 'No connection',
    message: 'Check your internet connection and try again.',
    emoji: '📡',
    primaryAction: { label: 'Try again', href: 'reload' },
  },
  generic: {
    code: 'generic',
    status: 0,
    title: 'Error',
    headline: 'Something went wrong',
    message: 'An unexpected error occurred.',
    emoji: '✨',
    primaryAction: { label: 'Go home', href: '/' },
  },
};

export function resolveErrorPageCode(
  status?: number,
  code?: string,
): ErrorPageCode {
  if (typeof status === 'number') {
    if (status === 400) return '400';
    if (status === 401) return '401';
    if (status === 403) return '403';
    if (status === 404) return '404';
    if (status === 405) return '405';
    if (status === 501) return '501';
    if (status === 503) return '503';
    if (status >= 500) return '500';
  }

  if (code === 'NOT_IMPLEMENTED') return '501';
  if (code === 'METHOD_NOT_ALLOWED') return '405';
  if (code === 'NOT_FOUND') return '404';

  return 'generic';
}

export function getErrorPageContent(
  code: ErrorPageCode,
  customMessage?: string,
): ErrorPageContent {
  const base = ERROR_PAGE_CONTENT[code];
  if (!customMessage) return base;
  return { ...base, message: customMessage };
}
