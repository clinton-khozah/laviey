import { apiConfig } from '@/config/api.config';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { getAdminSession } from '@/features/admin/session/adminSession';
import type { ApiResponse } from '@/types';

export interface CommandOverview {
  totalMembers: number;
  platinumMembers: number;
  matchesToday: number;
  openSupportTickets: number;
  moderationQueue: number;
  pendingHrItems: number;
  activeAlgorithm: string | null;
  revenueAttributed30d: string;
}

export interface ActivityItem {
  id: string;
  category: 'moderation' | 'support' | 'hr' | 'broadcast' | 'system';
  title: string;
  detail: string;
  occurredAt: string;
  tone: 'info' | 'warn' | 'success';
}

export interface SystemAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium';
  title: string;
  detail: string;
  actionLabel?: string;
  actionTarget?: 'content' | 'comms' | 'hr' | 'ai';
}

export interface Broadcast {
  id: string;
  audience: string;
  title: string;
  message: string;
  status: string;
  recipientEstimate: number;
  sentAt: string | null;
  createdAt: string;
}

export interface MonetizationWallet {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  plan: 'Platinum' | 'Free';
  giftBalance: number;
  withdrawEnabled: boolean;
  wasGifted: boolean;
  lastGiftAt: string | null;
}

export interface AnalyticsSummary {
  year: number;
  activeUsers30d: number;
  avgHoursOnPlatform: number;
  newMembersThisMonth: number;
  newUsersMonth: string;
  platinumMembers: number;
  monthlyRegistrations: Array<{ month: string; men: number; women: number; other: number }>;
  monthlyRevenue: Array<{ month: string; amount: number }>;
  monthlyEngagement: Array<{ month: string; activeUsers: number; avgHours: number }>;
  dailyNewUsers: Array<{ day: number; users: number }>;
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

  if (!response.ok) await parseError(response);
  return response.json() as Promise<T>;
}

function formatActivityTime(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

export const adminOpsService = {
  getCommandOverview(): Promise<CommandOverview> {
    return adminRequest<ApiResponse<CommandOverview>>('GET', API_ENDPOINTS.admin.opsOverview).then((r) => r.data);
  },

  getActivityFeed(limit = 25): Promise<ActivityItem[]> {
    return adminRequest<ApiResponse<ActivityItem[]>>('GET', API_ENDPOINTS.admin.opsActivity, undefined, {
      limit: String(limit),
    }).then((r) => r.data);
  },

  getSystemAlerts(): Promise<SystemAlert[]> {
    return adminRequest<ApiResponse<SystemAlert[]>>('GET', API_ENDPOINTS.admin.opsAlerts).then((r) => r.data);
  },

  listBroadcasts(): Promise<Broadcast[]> {
    return adminRequest<ApiResponse<Broadcast[]>>('GET', API_ENDPOINTS.admin.opsBroadcasts).then((r) => r.data);
  },

  createBroadcast(input: { audience: string; title: string; message: string }): Promise<Broadcast> {
    return adminRequest<ApiResponse<Broadcast>>('POST', API_ENDPOINTS.admin.opsBroadcasts, input).then((r) => r.data);
  },

  getAnalyticsSummary(year: number): Promise<AnalyticsSummary> {
    return adminRequest<ApiResponse<AnalyticsSummary>>('GET', API_ENDPOINTS.admin.opsAnalytics, undefined, {
      year: String(year),
    }).then((r) => r.data);
  },

  async downloadExport(type: 'members' | 'moderation' | 'support' | 'algorithms'): Promise<void> {
    const url = `${apiConfig.baseUrl}${API_ENDPOINTS.admin.opsExport(type)}`;
    const response = await fetch(url, { headers: adminHeaders() });
    if (!response.ok) await parseError(response);
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match?.[1] ?? `lavey-${type}-export.csv`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  listMonetizationWallets(search?: string): Promise<MonetizationWallet[]> {
    return adminRequest<ApiResponse<MonetizationWallet[]>>(
      'GET',
      API_ENDPOINTS.admin.opsMonetizationWallets,
      undefined,
      search ? { search } : undefined,
    ).then((r) => r.data);
  },

  patchMonetizationWallet(userId: string, input: { withdrawEnabled?: boolean }): Promise<MonetizationWallet> {
    return adminRequest<ApiResponse<MonetizationWallet>>(
      'PATCH',
      API_ENDPOINTS.admin.opsMonetizationWallet(userId),
      input,
    ).then((r) => r.data);
  },

  sendAdminGift(userId: string, amount: number): Promise<MonetizationWallet> {
    return adminRequest<ApiResponse<MonetizationWallet>>(
      'POST',
      API_ENDPOINTS.admin.opsMonetizationGift(userId),
      { amount },
    ).then((r) => r.data);
  },

  formatActivityTime,
};
