import { env, usesBackendAuth } from '@/config/env';
import { apiConfig } from '@/config/api.config';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { getGoogleSignInBlockedMessage } from '@/utils/google/googleEnvironment';
import { resetOAuthCallbackState } from '@/utils/auth/oauthCallbackState';
import { isLocalApiBaseUrl, stashOAuthRedirectContext } from '@/utils/auth/oauthRedirectStorage';
import { requestGoogleIdToken } from '@/utils/google/googleIdTokenSignIn';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { defaultAvatar } from '@/constants/defaultAvatar';
import { httpClient } from '@/services/api/httpClient';
import type {
  ApiResponse,
  AuthSession,
  EmailAuthResponse,
  EmailSignInRequest,
  EmailSignUpRequest,
  EmailSignUpResult,
} from '@/types';
import { ApiError } from '@/services/api/apiError';
import { getApiConfigurationError } from '@/utils/api/apiConfiguration';
import { sleep } from '@/utils/sleep';

function persistSession(session: AuthSession): void {
  localStorage.setItem(STORAGE_KEYS.authToken, session.token);
  localStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(session.user));
}

function clearSession(): void {
  localStorage.removeItem(STORAGE_KEYS.authToken);
  localStorage.removeItem(STORAGE_KEYS.authUser);
}

function readStoredSession(): AuthSession | null {
  const token = localStorage.getItem(STORAGE_KEYS.authToken);
  const rawUser = localStorage.getItem(STORAGE_KEYS.authUser);
  if (!token || !rawUser) return null;

  try {
    const user = JSON.parse(rawUser) as AuthSession['user'];
    return { token, user };
  } catch {
    clearSession();
    return null;
  }
}

function mockGoogleSession(): AuthSession {
  return {
    token: `mock-google-token-${Date.now()}`,
    user: {
      id: 'google-user-1',
      email: 'you@gmail.com',
      displayName: 'You',
      avatarUrl: defaultAvatar,
      provider: 'google',
    },
  };
}

function mockEmailSession(email: string, displayName?: string): AuthSession {
  return {
    token: `mock-email-token-${Date.now()}`,
    user: {
      id: `email-${email}`,
      email,
      displayName: displayName ?? email.split('@')[0],
      avatarUrl: defaultAvatar,
      provider: 'email',
    },
  };
}

/**
 * Authentication API — Google OAuth + email/password.
 * Mock mode stores session in localStorage until .NET auth is wired.
 */
export const authService = {
  getStoredSession(): AuthSession | null {
    return readStoredSession();
  },

  async restoreSession(): Promise<AuthSession | null> {
    const stored = readStoredSession();
    if (!stored) return null;

    if (!usesBackendAuth()) {
      await sleep(200);
      return stored;
    }

    try {
      const response = await httpClient.get<ApiResponse<AuthSession['user']>>(
        API_ENDPOINTS.auth.me,
      );
      return { token: stored.token, user: response.data };
    } catch {
      clearSession();
      return null;
    }
  },

  async signInWithGoogle(): Promise<AuthSession> {
    if (!usesBackendAuth()) {
      await sleep(500);
      const session = mockGoogleSession();
      persistSession(session);
      return session;
    }

    const apiConfigError = getApiConfigurationError();
    if (apiConfigError) {
      throw new Error(apiConfigError);
    }

    const webViewMessage = getGoogleSignInBlockedMessage();
    if (webViewMessage) {
      throw new Error(webViewMessage);
    }

    // Local dev: ID token POST — avoids Supabase PKCE redirect to the live site.
    const useLocalIdTokenFlow =
      import.meta.env.DEV && env.googleClientId && isLocalApiBaseUrl(apiConfig.baseUrl);

    if (import.meta.env.DEV) {
      console.info(
        `[auth] Google sign-in: ${useLocalIdTokenFlow ? 'local ID token → POST /auth/google' : 'redirect → GET /auth/google'}`,
        { api: apiConfig.baseUrl, hasClientId: Boolean(env.googleClientId) },
      );
    }

    if (useLocalIdTokenFlow) {
      const idToken = await requestGoogleIdToken();
      const res = await httpClient.post<ApiResponse<AuthSession>>(API_ENDPOINTS.auth.google, {
        body: { idToken },
      });
      persistSession(res.data);
      return res.data;
    }

    resetOAuthCallbackState();
    stashOAuthRedirectContext(apiConfig.baseUrl, window.location.origin);
    const origin = encodeURIComponent(window.location.origin);
    window.location.assign(
      `${apiConfig.baseUrl}${API_ENDPOINTS.auth.google}?origin=${origin}`,
    );
    return new Promise(() => {
      /* full-page redirect to Google via backend */
    });
  },

  async completeGoogleOAuthCallback(token: string): Promise<AuthSession> {
    localStorage.setItem(STORAGE_KEYS.authToken, token);

    const response = await httpClient.get<ApiResponse<AuthSession['user']>>(
      API_ENDPOINTS.auth.me,
    );

    const session: AuthSession = { token, user: response.data };
    persistSession(session);
    return session;
  },

  async signInWithEmail(payload: EmailSignInRequest): Promise<AuthSession> {
    if (!usesBackendAuth()) {
      await sleep(450);
      const session = mockEmailSession(payload.email);
      persistSession(session);
      return session;
    }

    const response = await httpClient.post<ApiResponse<AuthSession>>(
      API_ENDPOINTS.auth.login,
      { body: payload },
    );
    persistSession(response.data);
    return response.data;
  },

  async signUpWithEmail(payload: EmailSignUpRequest): Promise<EmailSignUpResult> {
    if (!usesBackendAuth()) {
      await sleep(550);
      const session = mockEmailSession(payload.email, payload.displayName);
      persistSession(session);
      return session;
    }

    const response = await httpClient.post<ApiResponse<EmailAuthResponse>>(
      API_ENDPOINTS.auth.register,
      { body: payload },
    );

    const data = response.data;
    if (data.needsEmailVerification) {
      return { needsEmailVerification: true, email: data.email };
    }

    if (!data.token || !data.user) {
      throw new ApiError(500, 'INVALID_AUTH_RESPONSE', 'Account created but session was missing.');
    }

    const session: AuthSession = { token: data.token, user: data.user };
    persistSession(session);
    return session;
  },

  async verifyEmailWithCode(email: string, code: string): Promise<AuthSession> {
    if (!usesBackendAuth()) {
      await sleep(300);
      const session = mockEmailSession(email);
      persistSession(session);
      return session;
    }

    const response = await httpClient.post<ApiResponse<AuthSession>>(
      API_ENDPOINTS.auth.verifyEmail,
      { body: { email, code } },
    );
    persistSession(response.data);
    return response.data;
  },

  async resendVerificationEmail(email: string): Promise<void> {
    if (!usesBackendAuth()) {
      await sleep(200);
      return;
    }

    await httpClient.post<ApiResponse<{ sent: boolean }>>(
      API_ENDPOINTS.auth.resendVerification,
      { body: { email } },
    );
  },

  async signOut(): Promise<void> {
    if (usesBackendAuth()) {
      try {
        await httpClient.post(API_ENDPOINTS.auth.logout);
      } catch {
        /* clear local session even if server logout fails */
      }
    }
    clearSession();
  },
};
