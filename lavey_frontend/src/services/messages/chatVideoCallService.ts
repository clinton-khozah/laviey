import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse, ChatVideoCall, ChatVideoCallAction } from '@/types';

export const chatVideoCallService = {
  async getActive(): Promise<ChatVideoCall | null> {
    const response = await httpClient.get<ApiResponse<ChatVideoCall | null>>(
      API_ENDPOINTS.messages.activeVideoCall,
      { skipErrorPage: true },
    );
    return response.data;
  },

  async start(conversationId: string): Promise<ChatVideoCall> {
    const response = await httpClient.post<ApiResponse<ChatVideoCall>>(
      API_ENDPOINTS.messages.startVideoCall(conversationId),
      { skipErrorPage: true },
    );
    return response.data;
  },

  async update(callId: string, action: ChatVideoCallAction): Promise<ChatVideoCall> {
    const response = await httpClient.patch<ApiResponse<ChatVideoCall>>(
      API_ENDPOINTS.messages.updateVideoCall(callId),
      { body: { action }, skipErrorPage: true },
    );
    return response.data;
  },
};
