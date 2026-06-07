import { env } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import { MOCK_PROFILES } from '@/services/mocks/profile.mock';
import type { ApiResponse, SendFlameResponse } from '@/types';
import { sleep } from '@/utils/sleep';

/**
 * Match actions (flame / like) API.
 */
export const matchService = {
  async sendFlame(profileId: string): Promise<SendFlameResponse> {
    if (env.useMockApi) {
      await sleep(250);
      const profile = MOCK_PROFILES.find((p) => p.id === profileId);
      const matched = Boolean(profile?.likedYou);
      return {
        matched,
        matchId: matched ? `mock-match-${profileId}` : undefined,
        profileName: profile?.name ?? 'Someone',
        profileAvatar: profile?.avatar ?? '',
      };
    }

    const response = await httpClient.post<ApiResponse<SendFlameResponse>>(
      API_ENDPOINTS.matches.flame,
      { body: { profileId } },
    );

    return response.data;
  },
};
