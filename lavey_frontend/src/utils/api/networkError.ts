import { apiConfig } from '@/config/api.config';
import { ApiError } from '@/services/api/apiError';

export function networkErrorMessage(): string {
  return `Cannot reach the API at ${apiConfig.baseUrl}. Start the backend: open a terminal in lavey-backend and run npm run dev (port 5000).`;
}

export function toApiNetworkError(err: unknown): ApiError | null {
  if (!(err instanceof TypeError)) return null;
  const message = err.message.toLowerCase();
  if (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed') ||
    message.includes('network request failed')
  ) {
    return new ApiError(0, 'NETWORK_ERROR', networkErrorMessage());
  }
  return null;
}
