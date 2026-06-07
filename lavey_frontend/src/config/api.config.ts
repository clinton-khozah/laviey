import { env } from './env';

export const apiConfig = {
  baseUrl: env.apiBaseUrl.replace(/\/$/, ''),
  defaultTimeoutMs: 30_000,
} as const;
