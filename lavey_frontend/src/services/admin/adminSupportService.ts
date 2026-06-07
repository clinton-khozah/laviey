import { apiConfig } from '@/config/api.config';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { getAdminSession } from '@/features/admin/session/adminSession';
import type { ApiResponse } from '@/types';

export interface AdminSupportTicketListItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  status: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
}

export interface AdminSupportMessage {
  id: string;
  sender: 'user' | 'admin' | 'system';
  text: string;
  sentAt: string;
  adminName?: string;
}

export interface AdminSupportTicketDetail {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  status: string;
  messages: AdminSupportMessage[];
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
): Promise<T> {
  const url = `${apiConfig.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
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

export const adminSupportService = {
  listTickets(): Promise<AdminSupportTicketListItem[]> {
    return adminRequest<ApiResponse<AdminSupportTicketListItem[]>>(
      'GET',
      API_ENDPOINTS.admin.supportTickets,
    ).then((res) => res.data);
  },

  getTicket(ticketId: string): Promise<AdminSupportTicketDetail> {
    return adminRequest<ApiResponse<AdminSupportTicketDetail>>(
      'GET',
      API_ENDPOINTS.admin.supportTicket(ticketId),
    ).then((res) => res.data);
  },

  reply(ticketId: string, body: string): Promise<AdminSupportTicketDetail> {
    return adminRequest<ApiResponse<AdminSupportTicketDetail>>(
      'POST',
      API_ENDPOINTS.admin.supportTicketMessages(ticketId),
      { body },
    ).then((res) => res.data);
  },

  updateStatus(
    ticketId: string,
    status: 'open' | 'pending' | 'resolved',
  ): Promise<void> {
    return adminRequest<ApiResponse<{ ok: boolean }>>(
      'PATCH',
      API_ENDPOINTS.admin.supportTicket(ticketId),
      { status },
    ).then(() => undefined);
  },
};
