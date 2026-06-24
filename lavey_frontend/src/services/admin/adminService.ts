import { apiConfig } from '@/config/api.config';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { getAdminSession } from '@/features/admin/session/adminSession';
import type {
  AdminUserAction,
  AdminUserDetail,
  AdminUserInsight,
  AdminUserLiker,
  AdminUserMatch,
  AdminUserMeeting,
  AdminUpdateUserInput,
  AdminUsersListResponse,
  AdminUsersRecordFilter,
  AdminUsersStatusFilter,
  AdminUsersView,
} from '@/types/admin.types';
import type { ApiResponse } from '@/types';

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

async function adminGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${apiConfig.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json', ...adminHeaders() },
  });

  if (!response.ok) await parseError(response);
  return response.json() as Promise<T>;
}

async function adminPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiConfig.baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...adminHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) await parseError(response);
  return response.json() as Promise<T>;
}

async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiConfig.baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...adminHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) await parseError(response);
  return response.json() as Promise<T>;
}

async function adminDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${apiConfig.baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json', ...adminHeaders() },
  });

  if (!response.ok) await parseError(response);
  return response.json() as Promise<T>;
}

export const adminService = {
  listUsers(params: {
    view: AdminUsersView;
    page: number;
    limit?: number;
    search?: string;
    status?: AdminUsersStatusFilter;
    record?: AdminUsersRecordFilter;
  }): Promise<AdminUsersListResponse> {
    return adminGet<ApiResponse<AdminUsersListResponse>>(API_ENDPOINTS.admin.users, {
      view: params.view,
      page: params.page,
      limit: params.limit ?? 10,
      search: params.search,
      status: params.status,
      record: params.record,
    }).then((res) => res.data);
  },

  getUserById(userId: string): Promise<AdminUserDetail> {
    return adminGet<ApiResponse<AdminUserDetail>>(API_ENDPOINTS.admin.userById(userId)).then((res) => res.data);
  },

  getUserLikers(userId: string): Promise<AdminUserLiker[]> {
    return adminGet<ApiResponse<AdminUserLiker[]>>(API_ENDPOINTS.admin.userLikers(userId)).then((res) => res.data);
  },

  getUserMatches(userId: string): Promise<AdminUserMatch[]> {
    return adminGet<ApiResponse<AdminUserMatch[]>>(API_ENDPOINTS.admin.userMatches(userId)).then((res) => res.data);
  },

  getUserMeetings(userId: string): Promise<AdminUserMeeting[]> {
    return adminGet<ApiResponse<AdminUserMeeting[]>>(API_ENDPOINTS.admin.userMeetings(userId)).then((res) => res.data);
  },

  getUserInsight(userId: string): Promise<AdminUserInsight> {
    return adminGet<ApiResponse<AdminUserInsight>>(API_ENDPOINTS.admin.userInsight(userId)).then((res) => res.data);
  },

  applyUserAction(
    userId: string,
    action: AdminUserAction,
    payload?: { postId?: string },
  ): Promise<AdminUserDetail> {
    return adminPost<ApiResponse<AdminUserDetail>>(API_ENDPOINTS.admin.userAction(userId), {
      action,
      ...payload,
    }).then((res) => res.data);
  },

  updateUser(userId: string, body: AdminUpdateUserInput): Promise<AdminUserDetail> {
    return adminPatch<ApiResponse<AdminUserDetail>>(API_ENDPOINTS.admin.userById(userId), body).then(
      (res) => res.data,
    );
  },

  deleteUser(userId: string): Promise<void> {
    return adminDelete<ApiResponse<{ deleted: true }>>(API_ENDPOINTS.admin.userById(userId)).then(() => undefined);
  },

  resetUserPassword(userId: string): Promise<{ email: string }> {
    return adminPost<ApiResponse<{ email: string }>>(API_ENDPOINTS.admin.userResetPassword(userId)).then(
      (res) => res.data,
    );
  },

  messageUser(userId: string, message: string): Promise<void> {
    return adminPost<ApiResponse<unknown>>(API_ENDPOINTS.admin.userMessage(userId), { message }).then(
      () => undefined,
    );
  },
};
