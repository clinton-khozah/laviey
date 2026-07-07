import { apiConfig } from '@/config/api.config';
import { ApiError } from '@/services/api/apiError';

const DEFAULT_REQUEST_TIMEOUT_MS = 25_000;

export { DEFAULT_REQUEST_TIMEOUT_MS };

export function networkErrorMessage(): string {
  const base = apiConfig.baseUrl;
  if (/localhost|127\.0\.0\.1/i.test(base)) {
    return `Cannot reach the API at ${base}. Start the backend: open a terminal in lavey-backend and run npm run dev (port 5000).`;
  }
  return 'Cannot reach the Lavey servers. Check your internet connection and try again.';
}

export function createTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timerId = window.setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, ms);

  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timerId),
  };
}

export function mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }

  return controller.signal;
}

export function toApiNetworkError(err: unknown): ApiError | null {
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return new ApiError(0, 'NETWORK_ERROR', networkErrorMessage());
  }

  if (!(err instanceof TypeError) && !(err instanceof DOMException)) return null;
  const message = err.message.toLowerCase();
  if (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed') ||
    message.includes('network request failed') ||
    message.includes('timed out') ||
    message.includes('aborted')
  ) {
    return new ApiError(0, 'NETWORK_ERROR', networkErrorMessage());
  }
  return null;
}
