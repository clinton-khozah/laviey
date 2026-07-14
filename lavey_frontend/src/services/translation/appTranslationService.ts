import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import type { MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse } from '@/types';

interface TranslationResult {
  translations: string[];
}

export const appTranslationService = {
  async translate(texts: string[], targetLanguage: Exclude<MeetingLanguageCode, 'en'>): Promise<string[]> {
    const response = await httpClient.post<ApiResponse<TranslationResult>>(
      API_ENDPOINTS.translation.ui,
      {
        body: { texts, targetLanguage },
        skipErrorPage: true,
      },
    );
    return response.data.translations;
  },
};
