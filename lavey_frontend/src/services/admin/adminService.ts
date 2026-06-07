import { apiConfig } from '@/config/api.config';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { getAdminSession } from '@/features/admin/session/adminSession';
import type { AdminUsersListResponse, AdminUsersView, AdminUserDetail } from '@/types/admin.types';
import type { ApiResponse } from '@/types';

function adminHeaders(): HeadersInit {
  const token = getAdminSession()?.token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function adminGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${apiConfig.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...adminHeaders(),
    },
  });

  if (!response.ok) {
    let message = response.statusText || 'Request failed';
    try {
      const body = (await response.json()) as { message?: string };
      message = body.message ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const adminService = {
  listUsers(params: {
    view: AdminUsersView;
    page: number;
    limit?: number;
    search?: string;
  }): Promise<AdminUsersListResponse> {
    return adminGet<ApiResponse<AdminUsersListResponse>>(API_ENDPOINTS.admin.users, {
      view: params.view,
      page: params.page,
      limit: params.limit ?? 10,
      search: params.search,
    }).then((res) => res.data);
  },

  getUserById(userId: string): Promise<AdminUserDetail> {
    return adminGet<ApiResponse<AdminUserDetail>>(API_ENDPOINTS.admin.userById(userId)).then(
      (res) => res.data,
    );
  },
};
