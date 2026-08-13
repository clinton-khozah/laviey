import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { authService } from '@/services/auth/authService';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse, UserProfile } from '@/types';
import { setProfileVerified } from '@/utils/profile/verificationStorage';
import { sleep } from '@/utils/sleep';

export interface VerificationStatusDto {
  status: 'none' | 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

function usesBackendVerification(): boolean {
  return usesBackendApi();
}

async function sourceToBlob(source: string): Promise<Blob> {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error('Could not read verification photo.');
  }
  return response.blob();
}

export const verificationService = {
  /** Submit reference + live selfie for admin review (always queued — no auto face match). */
  async submitForManualReview(referenceUrl: string, liveUrl: string): Promise<VerificationStatusDto> {
    if (!usesBackendVerification()) {
      await sleep(400);
      return { status: 'pending' };
    }

    const form = new FormData();
    form.append('reference', await sourceToBlob(referenceUrl), 'reference.jpg');
    form.append('live', await sourceToBlob(liveUrl), 'live.jpg');

    const res = await httpClient.postForm<ApiResponse<VerificationStatusDto>>(
      API_ENDPOINTS.users.verificationSubmit,
      form,
    );
    return res.data;
  },

  /** Legacy instant-verify endpoint — kept for mocks only. */
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
