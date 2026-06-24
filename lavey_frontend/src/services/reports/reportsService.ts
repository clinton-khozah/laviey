import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse } from '@/types';
import type { ModerationContentType } from '@/services/admin/adminModerationService';

export interface SubmitReportInput {
  subjectUserId: string;
  contentType: ModerationContentType;
  contentId?: string | null;
  reason: string;
}

export const reportsService = {
  async submit(input: SubmitReportInput): Promise<void> {
    if (!usesBackendApi()) return;

    await httpClient.post<ApiResponse<{ submitted: boolean }>>(API_ENDPOINTS.reports.submit, {
      body: input,
      skipErrorPage: true,
    });
  },
};
