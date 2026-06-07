import { apiConfig } from '@/config/api.config';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { maybeNavigateToErrorPage } from '@/utils/navigation/errorNavigation';
import { sanitizeAuthErrorMessage } from '@/utils/errors/userFacingErrorMessage';
import type { ApiErrorBody } from '@/types';
import { ApiError } from './apiError';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

function buildUrl(path: string, params?: RequestConfig['params']): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${apiConfig.baseUrl}${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  let code = `HTTP_${response.status}`;
  let message = response.statusText || 'Request failed';
  let details: unknown;

  try {
    const body = (await response.json()) as ApiErrorBody;
    code = body.code ?? code;
    message = body.message ?? message;
    details = body.details;
  } catch {
    /* non-JSON error body */
  }

  if (response.status === 401 || code === 'SESSION_EXPIRED') {
    message = sanitizeAuthErrorMessage(message);
    if (code === 'UNAUTHORIZED' && message.includes('expired')) {
      code = 'SESSION_EXPIRED';
    }
  }

  return new ApiError(response.status, code, message, details);
}

async function request<T>(
  method: HttpMethod,
  path: string,
  config: RequestConfig = {},
): Promise<T> {
  const headers: HeadersInit = {
    Accept: 'application/json',
    ...config.headers,
  };

  if (config.body !== undefined) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const hasAuthHeader = Boolean((headers as Record<string, string>).Authorization);
  if (!hasAuthHeader) {
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path, config.params), {
    method,
    headers,
    body: config.body !== undefined ? JSON.stringify(config.body) : undefined,
    signal: config.signal,
  });

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    maybeNavigateToErrorPage(error);
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function postForm<T>(path: string, formData: FormData, signal?: AbortSignal): Promise<T> {
  const headers: HeadersInit = {
    Accept: 'application/json',
  };

  const hasAuthHeader = Boolean((headers as Record<string, string>).Authorization);
  if (!hasAuthHeader) {
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers,
    body: formData,
    signal,
  });

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    maybeNavigateToErrorPage(error);
    throw error;
  }

  return response.json() as Promise<T>;
}

/** Typed HTTP client for all service modules */
export const httpClient = {
  get: <T>(path: string, config?: RequestConfig) => request<T>('GET', path, config),
  post: <T>(path: string, config?: RequestConfig) => request<T>('POST', path, config),
  postForm: <T>(path: string, formData: FormData, signal?: AbortSignal) =>
    postForm<T>(path, formData, signal),
  put: <T>(path: string, config?: RequestConfig) => request<T>('PUT', path, config),
  patch: <T>(path: string, config?: RequestConfig) => request<T>('PATCH', path, config),
  delete: <T>(path: string, config?: RequestConfig) => request<T>('DELETE', path, config),
};
