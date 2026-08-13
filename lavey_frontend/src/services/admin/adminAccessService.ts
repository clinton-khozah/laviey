import { apiConfig } from '@/config/api.config';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { getAdminSession } from '@/features/admin/session/adminSession';
import type { ApiResponse } from '@/types';

export interface AdminOperator {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string;
  status: 'invited' | 'in_progress' | 'active' | 'suspended' | 'inactive';
  lastLoginAt: string | null;
  employeeId: string | null;
}

async function request<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(getAdminSession()?.token ? { Authorization: `Bearer ${getAdminSession()!.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(error.message || 'Request failed');
  }
  return response.json() as Promise<T>;
}

export const adminAccessService = {
  listOperators: () => request<ApiResponse<AdminOperator[]>>('GET', API_ENDPOINTS.admin.adminOperators).then((r) => r.data),
  inviteOperator: (input: { name: string; email: string; roleId: string }) =>
    request<ApiResponse<{ emailSent: boolean; onboardingLink: string }>>('POST', API_ENDPOINTS.admin.inviteAdminOperator, input).then((r) => r.data),
  cancelInvite: (id: string) =>
    request<ApiResponse<{ id: string }>>('DELETE', API_ENDPOINTS.admin.cancelAdminOperatorInvite(id)).then((r) => r.data),
  resendInvite: (id: string) =>
    request<ApiResponse<{ emailSent: boolean; onboardingLink: string }>>('POST', API_ENDPOINTS.admin.resendAdminOperatorInvite(id)).then((r) => r.data),
};
