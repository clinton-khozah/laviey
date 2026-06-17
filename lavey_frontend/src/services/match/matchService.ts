import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import { MOCK_PROFILES } from '@/services/mocks/profile.mock';
import type {
  ApiResponse,
  MatchListItem,
  RespondICrushResponse,
  SendFlameResponse,
  SendICrushResponse,
} from '@/types';
import { sleep } from '@/utils/sleep';

/**
 * Match actions (flame / like / iCrush) API.
 */
export const matchService = {
  async sendFlame(profileId: string): Promise<SendFlameResponse> {
    if (!usesBackendApi()) {
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

  async sendICrush(profileId: string): Promise<SendICrushResponse> {
    if (!usesBackendApi()) {
      await sleep(280);
      const profile = MOCK_PROFILES.find((p) => p.id === profileId);
      return {
        matched: false,
        pending: true,
        alreadySent: false,
        inviteId: `mock-icrush-${profileId}`,
        conversationId: `icrush-mock-icrush-${profileId}`,
        profileName: profile?.name ?? 'Someone',
        profileAvatar: profile?.avatar ?? '',
      };
    }

    const response = await httpClient.post<ApiResponse<SendICrushResponse>>(
      API_ENDPOINTS.matches.iCrush,
      { body: { profileId } },
    );

    return response.data;
  },

  async acceptICrush(inviteId: string): Promise<RespondICrushResponse> {
    if (!usesBackendApi()) {
      await sleep(200);
      return {
        matchId: `mock-match-${inviteId}`,
        conversationId: `mock-conv-${inviteId}`,
        profileName: 'Someone',
        profileAvatar: '',
      };
    }

    const response = await httpClient.post<ApiResponse<RespondICrushResponse>>(
      API_ENDPOINTS.matches.iCrushAccept(inviteId),
    );

    return response.data;
  },

  async rejectICrush(inviteId: string): Promise<{ rejected: true }> {
    if (!usesBackendApi()) {
      await sleep(150);
      return { rejected: true };
    }

    const response = await httpClient.post<ApiResponse<{ rejected: true }>>(
      API_ENDPOINTS.matches.iCrushReject(inviteId),
    );

    return response.data;
  },

  async listMatches(limit = 50): Promise<MatchListItem[]> {
    if (!usesBackendApi()) {
      await sleep(200);
      return [];
    }

    const response = await httpClient.get<ApiResponse<MatchListItem[]>>(
      API_ENDPOINTS.matches.list,
      { params: { limit } },
    );

    return response.data;
  },
};
