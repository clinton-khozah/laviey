import axios from 'axios';
import { storage } from '../utils/storage';
import type { AuthSession } from '../types';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://laveybackend-3.onrender.com/api').replace(/\/$/, '');

/** refreshed = new tokens saved. kept = stay signed in (network/slow server). invalid = refresh token was rejected. */
export type SessionRefreshOutcome =
  | { status: 'refreshed'; session: AuthSession }
  | { status: 'kept'; session: AuthSession }
  | { status: 'invalid' };

let refreshInFlight: Promise<SessionRefreshOutcome> | null = null;

export function refreshStoredSession(): Promise<SessionRefreshOutcome> {
  if (!refreshInFlight) {
    refreshInFlight = refreshStoredSessionInternal().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** True when the access token is missing an expiry or will expire within the window. */
export function accessTokenExpiresSoon(token: string, withinMs = 10 * 60 * 1000): boolean {
  const exp = jwtExpiryMs(token);
  if (!exp) return true;
  return exp - Date.now() <= withinMs;
}

function jwtExpiryMs(token: string): number | null {
  const segment = token.split('.')[1];
  if (!segment) return null;
  try {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (padded.length % 4)) % 4;
    const json = globalThis.atob(`${padded}${'='.repeat(padLength)}`);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

async function refreshStoredSessionInternal(): Promise<SessionRefreshOutcome> {
  const current = await storage.getSession();
  if (!current) return { status: 'invalid' };
  if (!current.refreshToken) return { status: 'kept', session: current };

  try {
    const response = await axios.post<{ data: AuthSession }>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken: current.refreshToken },
      { timeout: 30_000 },
    );
    const next = response.data.data;
    if (!next?.token) return { status: 'kept', session: current };
    // A refresh response sometimes omits the refresh token. Keep the one we already have.
    const session: AuthSession = {
      ...current,
      ...next,
      token: next.token,
      refreshToken: next.refreshToken || current.refreshToken,
      user: next.user?.id ? next.user : current.user,
    };
    // Save before the lock is released so a second refresh cannot reuse the old token.
    await storage.setSession(session);
    return { status: 'refreshed', session };
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return { status: 'invalid' };
    }
    return { status: 'kept', session: current };
  }
}
