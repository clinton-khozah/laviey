import { apiConfig } from '@/config/api.config';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { getAdminSession } from '@/features/admin/session/adminSession';
import type { ApiResponse } from '@/types';

export type ModerationContentType =
  | 'profile_photo'
  | 'post'
  | 'bio'
  | 'chat_message'
  | 'meetup';

export type ReportSeverity = 'critical' | 'high' | 'medium' | 'low';

export type QueueAction = 'approve' | 'remove' | 'warn' | 'escalate' | 'hide_discover';
export type ReportAction = 'restrict_chat' | 'ban' | 'escalate' | 'dismiss';

export interface ModerationStats {
  aiPrescreen: number;
  humanReview: number;
  userReports: number;
  appealsWaiting: number;
  suspectedFakeProfiles: number;
}

export interface ModerationQueueItem {
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  contentType: ModerationContentType;
  contentId: string | null;
  previewText: string;
  mediaUrl: string | null;
  aiScore: number | null;
  aiSource: string;
  aiFlags: string[];
  queueTier: 'ai_prescreen' | 'human';
  status: string;
  createdAt: string;
  ageLabel: string;
}

export interface MemberReportItem {
  id: string;
  subjectUserId: string;
  subjectHandle: string;
  contentType: ModerationContentType;
  contentId: string | null;
  reason: string;
  severity: ReportSeverity;
  reportCount: number;
  status: string;
  ageLabel: string;
  mediaUrl: string | null;
}

export interface ModerationPolicy {
  autoApproveMinScore: number;
  humanReviewMaxScore: number;
  flagExplicit: boolean;
  flagScamBio: boolean;
}

function adminHeaders(): HeadersInit {
  const token = getAdminSession()?.token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function parseError(response: Response): Promise<never> {
  let message = response.statusText || 'Request failed';
  try {
    const body = (await response.json()) as { message?: string };
    message = body.message ?? message;
  } catch {
    /* ignore */
  }
  throw new Error(message);
}

async function adminRequest<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  params?: Record<string, string>,
): Promise<T> {
  const base = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${apiConfig.baseUrl}${base}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...adminHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json() as Promise<T>;
}

export const adminModerationService = {
  getStats(): Promise<ModerationStats> {
    return adminRequest<ApiResponse<ModerationStats>>('GET', API_ENDPOINTS.admin.moderationStats).then(
      (res) => res.data,
    );
  },

  listQueue(search?: string): Promise<ModerationQueueItem[]> {
    return adminRequest<ApiResponse<ModerationQueueItem[]>>(
      'GET',
      API_ENDPOINTS.admin.moderationQueue,
      undefined,
      search ? { search } : undefined,
    ).then((res) => res.data);
  },

  listReports(search?: string): Promise<MemberReportItem[]> {
    return adminRequest<ApiResponse<MemberReportItem[]>>(
      'GET',
      API_ENDPOINTS.admin.moderationReports,
      undefined,
      search ? { search } : undefined,
    ).then((res) => res.data);
  },

  queueAction(queueId: string, action: QueueAction): Promise<void> {
    return adminRequest<ApiResponse<{ ok: boolean }>>(
      'POST',
      API_ENDPOINTS.admin.moderationQueueAction(queueId),
      { action },
    ).then(() => undefined);
  },

  reportAction(reportId: string, action: ReportAction): Promise<void> {
    return adminRequest<ApiResponse<{ ok: boolean }>>(
      'POST',
      API_ENDPOINTS.admin.moderationReportAction(reportId),
      { action },
    ).then(() => undefined);
  },

  getPolicy(): Promise<ModerationPolicy> {
    return adminRequest<ApiResponse<ModerationPolicy>>('GET', API_ENDPOINTS.admin.moderationPolicy).then(
      (res) => res.data,
    );
  },

  savePolicy(policy: ModerationPolicy): Promise<ModerationPolicy> {
    return adminRequest<ApiResponse<ModerationPolicy>>(
      'PATCH',
      API_ENDPOINTS.admin.moderationPolicy,
      policy,
    ).then((res) => res.data);
  },

  rescanQueue(limit = 24): Promise<number> {
    return adminRequest<ApiResponse<{ scanned: number }>>(
      'POST',
      API_ENDPOINTS.admin.moderationRescan,
      { limit },
    ).then((res) => res.data.scanned);
  },
};
