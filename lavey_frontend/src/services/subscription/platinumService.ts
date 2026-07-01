import { usesBackendAuth } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { FALLBACK_PLATINUM_CATALOG } from '@/constants/platinum';
import { httpClient } from '@/services/api/httpClient';
import type {
  ApiResponse,
  PlatinumCancelResult,
  PlatinumCatalog,
  PlatinumSubscriptionStatus,
} from '@/types';
import type { PayfastCheckoutResponse } from '@/utils/subscription/payfastCheckout';
import { sleep } from '@/utils/sleep';

export interface PlatinumCatalogQuery {
  country?: string;
  currency?: string;
}

export const platinumService = {
  async getCatalog(query?: PlatinumCatalogQuery): Promise<PlatinumCatalog> {
    if (!usesBackendAuth()) {
      await sleep(150);
      return FALLBACK_PLATINUM_CATALOG;
    }

    const res = await httpClient.get<ApiResponse<PlatinumCatalog>>(
      API_ENDPOINTS.subscription.platinum,
      {
        params: {
          country: query?.country?.trim() || undefined,
          currency: query?.currency?.trim() || undefined,
        },
      },
    );
    return res.data;
  },

  async getStatus(): Promise<PlatinumSubscriptionStatus> {
    const res = await httpClient.get<ApiResponse<PlatinumSubscriptionStatus>>(
      API_ENDPOINTS.subscription.platinumStatus,
    );
    return res.data;
  },

  async startCheckout(planKey: string): Promise<PayfastCheckoutResponse> {
    const res = await httpClient.post<ApiResponse<PayfastCheckoutResponse>>(
      API_ENDPOINTS.subscription.platinumCheckout,
      { body: { planKey } },
    );
    return res.data;
  },

  async confirmReturn(input: {
    mPaymentId?: string;
    paymentStatus?: string;
    pfPaymentId?: string;
  }): Promise<PlatinumSubscriptionStatus> {
    const res = await httpClient.post<ApiResponse<PlatinumSubscriptionStatus>>(
      API_ENDPOINTS.subscription.platinumConfirmReturn,
      { body: input },
    );
    return res.data;
  },

  async cancel(): Promise<PlatinumCancelResult> {
    const res = await httpClient.post<ApiResponse<PlatinumCancelResult>>(
      API_ENDPOINTS.subscription.platinumCancel,
      { body: {} },
    );
    return res.data;
  },
};
