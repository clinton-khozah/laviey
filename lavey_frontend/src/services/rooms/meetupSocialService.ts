import { usesBackendMeetups } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse } from '@/types';

interface MeetupLikeResult {
  likeCount: number;
  userLiked: boolean;
}

export const meetupSocialService = {
  async setLike(meetupId: string, active: boolean): Promise<MeetupLikeResult | null> {
    if (!usesBackendMeetups()) return null;

    try {
      const res = await httpClient.post<ApiResponse<MeetupLikeResult>>(
        API_ENDPOINTS.dates.like(meetupId),
        { body: { active }, skipErrorPage: true },
      );
      return res.data;
    } catch {
      return null;
    }
  },

  async reportLiveAttendance(meetupId: string): Promise<void> {
    if (!usesBackendMeetups() || !meetupId) return;

    try {
      await httpClient.post<ApiResponse<{ ok: boolean }>>(
        API_ENDPOINTS.meetings.attend(meetupId),
        { skipErrorPage: true },
      );
    } catch {
      /* non-blocking */
    }
  },
};
