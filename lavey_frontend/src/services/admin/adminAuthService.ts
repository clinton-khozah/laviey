import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import { ApiError } from '@/services/api/apiError';
import {
  clearAdminSession,
  getAdminSession,
  persistAdminSession,
} from '@/features/admin/session/adminSession';
import type {
  AdminAuthSession,
  AdminRegisterRequest,
  AdminSignInRequest,
} from '@/types/domain/adminAuth.types';
import type { ApiResponse } from '@/types';

function adminAuthHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export const adminAuthService = {
  async getRegistrationStatus(): Promise<{ requiresInviteCode: boolean }> {
    const response = await httpClient.get<ApiResponse<{ requiresInviteCode: boolean }>>(
      API_ENDPOINTS.admin.auth.registrationStatus,
    );
    return response.data;
  },

  async signIn(payload: AdminSignInRequest): Promise<AdminAuthSession> {
    const response = await httpClient.post<ApiResponse<AdminAuthSession>>(API_ENDPOINTS.admin.auth.login, {
      body: payload,
    });
    persistAdminSession(response.data);
    return response.data;
  },

  async signUp(payload: AdminRegisterRequest): Promise<void> {
    await httpClient.post<ApiResponse<AdminAuthSession>>(API_ENDPOINTS.admin.auth.register, {
      body: payload,
    });
    // Account created only — user must sign in explicitly (no auto-login).
  },

  async restoreSession(): Promise<AdminAuthSession | null> {
    const existing = getAdminSession();
    if (!existing?.token) return null;

    try {
      const response = await httpClient.get<ApiResponse<{ admin: AdminAuthSession['admin'] }>>(
        API_ENDPOINTS.admin.auth.me,
        { headers: adminAuthHeaders(existing.token) },
      );
      if (!response.data?.admin) {
        clearAdminSession();
        return null;
      }
      const session: AdminAuthSession = { token: existing.token, admin: response.data.admin };
      persistAdminSession(session);
      return session;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAdminSession();
      }
      return null;
    }
  },

  signOut(): void {
    clearAdminSession();
  },
};
