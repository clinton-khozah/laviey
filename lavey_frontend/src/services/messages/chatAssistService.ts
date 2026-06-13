import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse, ChatAssistMessage, ChatAssistResult } from '@/types';
import { localChatAssist } from '@/utils/messages/localChatAssist';
import { sleep } from '@/utils/sleep';

function usesBackendMessages(): boolean {
  return usesBackendApi();
}

export const chatAssistService = {
  async analyze(
    conversationId: string,
    participantName: string,
    messages: ChatAssistMessage[],
  ): Promise<ChatAssistResult> {
    const transcript = messages.filter((m) => m.text.trim().length > 0);
    if (transcript.length === 0) {
      throw new Error('Send a message first so Loviey can read the vibe.');
    }

    if (!usesBackendMessages()) {
      await sleep(450);
      return localChatAssist(participantName, transcript);
    }

    try {
      const res = await httpClient.post<ApiResponse<ChatAssistResult>>(
        API_ENDPOINTS.messages.chatAssist(conversationId),
        {
          body: {
            participantName,
            messages: transcript.map((m) => ({
              sender: m.sender,
              text: m.text.trim(),
            })),
          },
        },
      );
      return res.data;
    } catch {
      return localChatAssist(participantName, transcript);
    }
  },
};
