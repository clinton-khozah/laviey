import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import type { MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';
import { httpClient } from '@/services/api/httpClient';
import { ApiError } from '@/services/api/apiError';
import type { ApiResponse, MeetingTranscriptResult } from '@/types';
import { convertBlobToWav } from '@/utils/media/audioToWav';

export const meetingTranscriptService = {
  async transcribeAudio(
    audioBlob: Blob,
    targetLanguage: MeetingLanguageCode,
  ): Promise<MeetingTranscriptResult | null> {
    if (!usesBackendApi() || audioBlob.size < 800) {
      return null;
    }

    let wavBlob: Blob;
    try {
      wavBlob = await convertBlobToWav(audioBlob);
    } catch {
      return null;
    }

    if (wavBlob.size < 1_000) {
      return null;
    }

    const formData = new FormData();
    formData.append('audio', wavBlob, `meetup-${Date.now()}.wav`);
    formData.append('targetLanguage', targetLanguage);

    try {
      const res = await httpClient.postForm<ApiResponse<MeetingTranscriptResult>>(
        API_ENDPOINTS.meetings.liveTranscript,
        formData,
        { skipErrorPage: true },
      );
      return res.data;
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      return null;
    }
  },
};
