import axios from 'axios';
import { storage } from '../utils/storage';
import type { AuthSession } from '../types';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://laveybackend-3.onrender.com/api').replace(/\/$/, '');

let refreshInFlight: Promise<AuthSession | null> | null = null;

/** Refresh tokens using the stored refresh token. Returns null only when the refresh token is invalid. */
export function refreshStoredSession(): Promise<AuthSession | null> {
  return refreshStoredSessionInternal();
}

async function refreshStoredSessionInternal(): Promise<AuthSession | null> {
  const current = await storage.getSession();
  if (!current?.refreshToken) return current;

  if (!refreshInFlight) {
    refreshInFlight = axios
      .post<{ data: AuthSession }>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken: current.refreshToken },
        { timeout: 30_000 },
      )
      .then((response) => response.data.data)
      .catch((error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          return null;
        }
        // Network / server wake-up issues should not sign the user out.
        return current;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  const result = await refreshInFlight;
  if (!result) return null;

  if (result.token !== current.token || result.refreshToken !== current.refreshToken) {
    await storage.setSession(result);
  }

  return result;
}
