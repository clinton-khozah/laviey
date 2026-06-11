import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse } from '@/types';
import {
  TRUST_INFO,
  type TrustInfoContent,
  type TrustInfoVariant,
} from '@/components/profile/TrustInfoSheet/trustInfoContent';
import { sleep } from '@/utils/sleep';

function usesBackendLegal(): boolean {
  return usesBackendApi();
}

const ENDPOINTS: Record<TrustInfoVariant, string> = {
  terms: API_ENDPOINTS.legal.terms,
  guidelines: API_ENDPOINTS.legal.guidelines,
};

export const legalService = {
  async getDocument(variant: TrustInfoVariant): Promise<TrustInfoContent> {
    if (!usesBackendLegal()) {
      await sleep(120);
      return TRUST_INFO[variant];
    }

    const res = await httpClient.get<ApiResponse<TrustInfoContent>>(ENDPOINTS[variant]);
    return res.data;
  },
};
