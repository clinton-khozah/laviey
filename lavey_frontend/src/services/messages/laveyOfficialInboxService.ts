import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse } from '@/types';

export interface LaveyOfficialInboxMessage {
  id: string;
  body: string;
  sentAt: string;
  sentAtLabel: string;
  isRead: boolean;
}

export interface LaveyOfficialInbox {
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
  messages: LaveyOfficialInboxMessage[];
}

export const laveyOfficialInboxService = {
  async getInbox(): Promise<LaveyOfficialInbox> {
    const response = await httpClient.get<ApiResponse<LaveyOfficialInbox>>(
      API_ENDPOINTS.messages.officialInbox,
    );
    return response.data;
  },

  async markRead(): Promise<void> {
    await httpClient.post(API_ENDPOINTS.messages.officialInboxRead, {});
  },
};
