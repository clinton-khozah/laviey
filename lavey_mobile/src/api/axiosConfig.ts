import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { storage } from '../utils/storage';
import { sessionEvents } from './sessionEvents';
import { refreshStoredSession } from './sessionRefresh';
import { isPublicAuthPath, networkErrorMessage } from '../utils/api/networkError';
import { ApiError } from './apiError';
import type { AuthSession } from '../types';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://laveybackend-3.onrender.com/api').replace(/\/$/, '');
export const api = axios.create({ baseURL: API_BASE_URL, timeout: 30_000, headers: { Accept: 'application/json' } });

type RetriableRequest = InternalAxiosRequestConfig & {
  _laveySessionRetry?: boolean;
  _laveyNetworkRetry?: boolean;
};

async function tryRefreshSession(): Promise<AuthSession | null> {
  return refreshStoredSession();
}

async function forceSessionExpired(): Promise<void> {
  const current = await storage.getSession();
  const provider = current?.user?.provider;
  await storage.clearSession();
  sessionEvents.expired({ provider });
}

api.interceptors.request.use(async (config) => {
  if (isPublicAuthPath(config.url)) return config;
  const session = await storage.getSession();
  if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; code?: string }>) => {
    const requestAuthHeader = error.config?.headers?.Authorization as string | undefined;
    const requestUrl = error.config?.url;
    const request = error.config as RetriableRequest | undefined;

    if (error.response?.status === 401 && requestAuthHeader && !isPublicAuthPath(requestUrl)) {
      const current = await storage.getSession();
      const currentAuthHeader = current?.token ? `Bearer ${current.token}` : undefined;

      if (request?._laveySessionRetry) {
        await forceSessionExpired();
      } else if (current && requestAuthHeader === currentAuthHeader && current.refreshToken && request) {
        const renewed = await tryRefreshSession();
        if (renewed?.token && renewed.token !== current.token) {
          request._laveySessionRetry = true;
          request.headers.Authorization = `Bearer ${renewed.token}`;
          return api.request(request);
        }
        await forceSessionExpired();
      } else if (!current?.refreshToken || requestAuthHeader === currentAuthHeader) {
        await forceSessionExpired();
      }
    }
    const isTransientNetworkFailure = !error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error');
    if (isTransientNetworkFailure && request && !request._laveyNetworkRetry && request.method?.toLowerCase() === 'get') {
      request._laveyNetworkRetry = true;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
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

    const message =
      error.response?.data?.message
      || (error.code === 'ECONNABORTED' ? 'The request took too long. Please try again.' : null)
      || (isTransientNetworkFailure ? networkErrorMessage() : error.message);

    return Promise.reject(
      new ApiError(
        message || 'Something went wrong. Please try again.',
        error.response?.status,
        error.response?.data?.code,
      ),
    );
  },
);
