import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { storage } from '../utils/storage';
import { accessTokenExpiresSoon, refreshStoredSession } from './sessionRefresh';
import { sessionEvents } from './sessionEvents';
import { isPublicAuthPath } from '../utils/api/networkError';
import { ApiError } from './apiError';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://laveybackend-3.onrender.com/api').replace(/\/$/, '');
export const api = axios.create({ baseURL: API_BASE_URL, timeout: 45_000, headers: { Accept: 'application/json' } });

type RetriableRequest = InternalAxiosRequestConfig & {
  _laveySessionRetry?: boolean;
  _laveyNetworkRetry?: number;
};

function bearerToken(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

api.interceptors.request.use(async (config) => {
  if (isPublicAuthPath(config.url)) return config;
  let session = await storage.getSession();
  if (session?.token && session.refreshToken && accessTokenExpiresSoon(session.token, 2 * 60 * 1000)) {
    const renewed = await refreshStoredSession();
    if (renewed.status !== 'invalid') session = renewed.session;
  }
  if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; code?: string }>) => {
    const requestUrl = error.config?.url;
    const request = error.config as RetriableRequest | undefined;
    const headerValue = error.config?.headers?.get?.('Authorization') ?? error.config?.headers?.Authorization;
    const requestToken = bearerToken(headerValue);

    if (error.response?.status === 401 && request && !isPublicAuthPath(requestUrl) && !request._laveySessionRetry) {
      const renewed = await refreshStoredSession();
      const nextToken = renewed.status === 'invalid' ? undefined : renewed.session.token;
      if (nextToken && (!requestToken || `Bearer ${nextToken}` !== requestToken)) {
        request._laveySessionRetry = true;
        request.headers.Authorization = `Bearer ${nextToken}`;
        return api.request(request);
      }
      if (renewed.status === 'invalid') {
        const stored = await storage.getSession();
        sessionEvents.expired({ provider: stored?.user.provider });
      }
    }
    const status = error.response?.status;
    const isTransientNetworkFailure = !error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error');
    const serverWaking = status === 502 || status === 503 || status === 504 || error.code === 'ECONNABORTED';
    const method = request?.method?.toLowerCase();
    const networkTries = request?._laveyNetworkRetry ?? 0;
    if (request && (method === 'get' || method === 'head') && networkTries < 2 && (isTransientNetworkFailure || serverWaking)) {
      request._laveyNetworkRetry = networkTries + 1;
      await new Promise((resolve) => setTimeout(resolve, 4_000 * (networkTries + 1)));
      return api.request(request);
    }

    if (__DEV__) {
      console.log(
        '[axios] request failed',
        'url:', error.config?.url,
        'code:', error.code,
        'status:', error.response?.status,
        'message:', error.message,
        'responseData:', JSON.stringify(error.response?.data),
      );
    }

    const rawMessage =
      error.response?.data?.message
      || (error.code === 'ECONNABORTED' ? 'The request took too long. Please try again.' : null)
      || (isTransientNetworkFailure || serverWaking ? 'Please try again.' : error.message);
    const message =
      error.response?.status === 401 && /session has expired|sign in again|token is expired|jwt expired/i.test(rawMessage || '')
        ? 'Please try that again.'
        : rawMessage;

    return Promise.reject(
      new ApiError(
        message || 'Something went wrong. Please try again.',
        error.response?.status,
        error.response?.data?.code,
      ),
    );
  },
);
