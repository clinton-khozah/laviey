import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse, FlameQuota } from '@/types';
import { sleep } from '@/utils/sleep';

/**
 * Freemium flame quota API.
 */
export const flameQuotaService = {
  async getQuota(): Promise<FlameQuota> {
    if (!usesBackendApi()) {
      await sleep(150);
      return { remaining: 3, max: 5 };
    }

    const response = await httpClient.get<ApiResponse<FlameQuota>>(
      API_ENDPOINTS.subscription.flameQuota,
    );

    return response.data;
  },
};
