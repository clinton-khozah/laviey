import { env, usesBackendAuth } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import type { MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';
import { authService } from '@/services/auth/authService';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse, AppTheme, ChatTypingStyle } from '@/types';
import { getLocalUserSettings, type UserSettings } from '@/utils/settings/applyUserSettings';
import { sleep } from '@/utils/sleep';

export interface UserSettingsResponse extends UserSettings {
  email: string;
  canChangePassword: boolean;
}

export interface UpdateUserSettingsInput {
  theme?: AppTheme;
  chatTypingStyle?: ChatTypingStyle;
  language?: MeetingLanguageCode;
  pushNotificationsEnabled?: boolean;
}

function usesBackendSettings(): boolean {
  return usesBackendAuth() && !env.useMockApi;
}

export const settingsService = {
  async getSettings(): Promise<UserSettingsResponse> {
    if (!usesBackendSettings()) {
      await sleep(150);
      const local = getLocalUserSettings();
      const session = authService.getStoredSession();
      return {
        ...local,
        email: session?.user.email ?? 'you@lavey.app',
        canChangePassword: session?.user.provider === 'email',
      };
    }

    const res = await httpClient.get<ApiResponse<UserSettingsResponse>>(
      API_ENDPOINTS.users.settings,
    );
    return res.data;
  },

  async updateSettings(input: UpdateUserSettingsInput): Promise<UserSettingsResponse> {
    if (!usesBackendSettings()) {
      await sleep(200);
      const current = getLocalUserSettings();
      const session = authService.getStoredSession();
      return {
        ...current,
        ...input,
        email: session?.user.email ?? 'you@lavey.app',
        canChangePassword: session?.user.provider === 'email',
      };
    }

    const res = await httpClient.patch<ApiResponse<UserSettingsResponse>>(
      API_ENDPOINTS.users.settings,
      { body: input },
    );
    return res.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!usesBackendAuth()) {
      await sleep(300);
      return;
    }

    await httpClient.post<ApiResponse<{ ok: boolean }>>(API_ENDPOINTS.auth.changePassword, {
      body: { currentPassword, newPassword },
    });
  },
};
