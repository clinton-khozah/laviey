import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse, MatchGreetingRequest, MatchGreetingResult } from '@/types';
import { localMatchGreetings } from '@/utils/match/localMatchGreetings';
import { sleep } from '@/utils/sleep';

export const matchGreetingService = {
  async getSuggestions(input: MatchGreetingRequest): Promise<MatchGreetingResult> {
    const name = input.participantName?.trim();
    if (!name) {
      return { suggestions: localMatchGreetings('there') };
    }

    if (!usesBackendApi()) {
      await sleep(350);
      return { suggestions: localMatchGreetings(name) };
    }

    try {
      const res = await httpClient.post<ApiResponse<MatchGreetingResult>>(
        API_ENDPOINTS.matches.greetings,
        {
          body: {
            participantName: name,
            bio: input.bio?.trim() || undefined,
            interests: input.interests?.filter((tag) => tag.trim().length > 0),
          },
        },
      );
      if (res.data.suggestions.length > 0) {
        return res.data;
      }
    } catch {
      // Fall through to local copy.
    }

    return { suggestions: localMatchGreetings(name) };
  },
};
