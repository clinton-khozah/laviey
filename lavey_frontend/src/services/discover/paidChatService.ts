import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse } from '@/types';
import type { PayfastCheckoutResponse } from '@/utils/subscription/payfastCheckout';

export interface ChatCreditPack {
  id: string;
  label: string;
  description: string;
  credits: number;
  amountZar: number;
}

export interface ChatCreditCatalog {
  balance: number;
  packs: ChatCreditPack[];
}

export const paidChatService = {
  async getCatalog(): Promise<ChatCreditCatalog> {
    const response = await httpClient.get<ApiResponse<ChatCreditCatalog>>(
      API_ENDPOINTS.paidChat.catalog,
      { skipErrorPage: true },
    );
    return response.data;
  },

  async startCheckout(packId: string): Promise<PayfastCheckoutResponse> {
    const response = await httpClient.post<ApiResponse<PayfastCheckoutResponse>>(
      API_ENDPOINTS.paidChat.checkout,
      { body: { packId }, skipErrorPage: true },
    );
    return response.data;
  },

  async getCheckoutStatus(paymentId: string): Promise<{
    status: string;
    credits: number;
    balance: number;
  }> {
    const response = await httpClient.get<ApiResponse<{
      status: string;
      credits: number;
      balance: number;
    }>>(API_ENDPOINTS.paidChat.checkoutStatus(paymentId), { skipErrorPage: true });
    return response.data;
  },

  async unlock(profileId: string): Promise<{ conversationId: string; balance: number }> {
    const response = await httpClient.post<ApiResponse<{ conversationId: string; balance: number }>>(
      API_ENDPOINTS.paidChat.unlock(profileId),
      { body: {}, skipErrorPage: true },
    );
    return response.data;
  },
};
