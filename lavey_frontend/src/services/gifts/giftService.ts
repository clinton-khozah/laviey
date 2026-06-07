import { env } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import { addGiftEarnings } from '@/utils/gift/giftEarningsStorage';
import type { ApiResponse, SendGiftRequest, SendGiftResponse } from '@/types';
import { sleep } from '@/utils/sleep';

const sessionTotals = new Map<string, number>();

export const giftService = {
  async sendGift(request: SendGiftRequest): Promise<SendGiftResponse> {
    if (env.useMockApi) {
      await sleep(180);
      addGiftEarnings(request.recipientId, request.amount);
      const sessionKey = `${request.meetupId}:${request.recipientId}`;
      const prev = sessionTotals.get(sessionKey) ?? 0;
      const totalSentThisSession = prev + request.amount;
      sessionTotals.set(sessionKey, totalSentThisSession);
      return {
        amount: request.amount,
        recipientId: request.recipientId,
        totalSentThisSession,
      };
    }
    const res = await httpClient.post<ApiResponse<SendGiftResponse>>(API_ENDPOINTS.gifts.send, {
      body: request,
    });
    return res.data;
  },
};
