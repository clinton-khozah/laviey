import { env, usesBackendAuth } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { authService } from '@/services/auth/authService';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse, UserProfile } from '@/types';
import { setProfileVerified } from '@/utils/profile/verificationStorage';
import { sleep } from '@/utils/sleep';

function usesBackendVerification(): boolean {
  return usesBackendAuth() && !env.useMockApi;
}

export const verificationService = {
  async completeVerification(): Promise<UserProfile | null> {
    const userId = authService.getStoredSession()?.user?.id ?? 'me';

    if (!usesBackendVerification()) {
      await sleep(400);
      setProfileVerified(userId, true);
      return null;
    }

    const res = await httpClient.post<ApiResponse<UserProfile>>(API_ENDPOINTS.users.verification);
    setProfileVerified(userId, true);
    return res.data;
  },
};
