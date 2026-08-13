import { apiConfig } from '@/config/api.config';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { getAdminSession } from '@/features/admin/session/adminSession';
import type { ApiResponse } from '@/types';

export interface VerificationQueueItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  referencePhotoUrl: string | null;
  livePhotoUrl: string | null;
  aiOutcome: string;
  aiConfidence: number | null;
  createdAt: string;
  ageLabel: string;
}

export interface VerificationNotificationSettings {
  notificationEmail: string;
  updatedAt: string | null;
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

async function adminRequest<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
  const base = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${apiConfig.baseUrl}${base}`, {
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

export const adminVerificationService = {
  getNotificationSettings(): Promise<VerificationNotificationSettings> {
    return adminRequest<ApiResponse<VerificationNotificationSettings>>(
      'GET',
      API_ENDPOINTS.admin.verificationSettings,
    ).then((res) => res.data);
  },

  updateNotificationSettings(notificationEmail: string): Promise<VerificationNotificationSettings> {
    return adminRequest<ApiResponse<VerificationNotificationSettings>>(
      'PATCH',
      API_ENDPOINTS.admin.verificationSettings,
      { notificationEmail },
    ).then((res) => res.data);
  },

  listQueue(): Promise<VerificationQueueItem[]> {
    return adminRequest<ApiResponse<VerificationQueueItem[]>>('GET', API_ENDPOINTS.admin.verificationQueue).then(
      (res) => res.data,
    );
  },

  approve(requestId: string): Promise<void> {
    return adminRequest<ApiResponse<{ ok: boolean }>>(
      'POST',
      API_ENDPOINTS.admin.verificationApprove(requestId),
    ).then(() => undefined);
  },

  reject(requestId: string, reason?: string): Promise<void> {
    return adminRequest<ApiResponse<{ ok: boolean }>>(
      'POST',
      API_ENDPOINTS.admin.verificationReject(requestId),
      reason ? { reason } : undefined,
    ).then(() => undefined);
  },
};
