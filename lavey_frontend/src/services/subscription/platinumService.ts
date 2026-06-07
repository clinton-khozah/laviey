import { usesBackendAuth } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { FALLBACK_PLATINUM_CATALOG } from '@/constants/platinum';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse, PlatinumCatalog } from '@/types';
import { sleep } from '@/utils/sleep';

export const platinumService = {
  async getCatalog(): Promise<PlatinumCatalog> {
    if (!usesBackendAuth()) {
      await sleep(150);
      return FALLBACK_PLATINUM_CATALOG;
    }

    const res = await httpClient.get<ApiResponse<PlatinumCatalog>>(
      API_ENDPOINTS.subscription.platinum,
    );
    return res.data;
  },
};
