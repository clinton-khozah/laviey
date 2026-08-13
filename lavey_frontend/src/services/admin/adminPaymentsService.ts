import { apiConfig } from '@/config/api.config';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { getAdminSession } from '@/features/admin/session/adminSession';
import type { ApiResponse } from '@/types';

export type AdminPaymentStatus = 'pending' | 'complete' | 'cancelled' | 'failed';
export type AdminPaymentPurchaseKind = 'platinum' | 'chat_credits';

export interface AdminPaymentRow {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  purchaseKind: AdminPaymentPurchaseKind;
  planKey: string;
  planLabel: string;
  amountZar: number;
  status: AdminPaymentStatus;
  isRecurring: boolean;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  pfPaymentId: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ListAdminPaymentsParams {
  page?: number;
  limit?: number;
  status?: AdminPaymentStatus | 'all';
  purchaseKind?: AdminPaymentPurchaseKind | 'all';
  search?: string;
}

export interface ListAdminPaymentsResult {
  payments: AdminPaymentRow[];
  totals: { totalCompletedZar: number };
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminCancelSubscriptionResult {
  isPremium: boolean;
  premiumExpiresAt: string | null;
  activeCheckout: {
    planKey: string;
    planLabel: string;
    status: string;
    isRecurring: boolean;
    cancelAtPeriodEnd: boolean;
  } | null;
  emailSent: boolean;
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
  method: 'GET' | 'POST',
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

  if (!response.ok) await parseError(response);
  return response.json() as Promise<T>;
}

export const adminPaymentsService = {
  list(params: ListAdminPaymentsParams = {}): Promise<ListAdminPaymentsResult> {
    return adminRequest<ApiResponse<ListAdminPaymentsResult>>('GET', API_ENDPOINTS.admin.payments, undefined, {
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
      status: params.status ?? 'all',
      purchaseKind: params.purchaseKind ?? 'all',
      ...(params.search ? { search: params.search } : {}),
    }).then((r) => r.data);
  },

  cancelSubscription(userId: string): Promise<AdminCancelSubscriptionResult> {
    return adminRequest<ApiResponse<AdminCancelSubscriptionResult>>(
      'POST',
      API_ENDPOINTS.admin.paymentCancelSubscription(userId),
    ).then((r) => r.data);
  },
};
