import { apiConfig } from '@/config/api.config';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { getAdminSession } from '@/features/admin/session/adminSession';
import type { ApiResponse } from '@/types';

export type CompanyBillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'one_time';
export type CompanySubscriptionStatus = 'active' | 'paused' | 'cancelled';

export interface CompanySubscription {
  id: string;
  name: string;
  vendor: string;
  description: string;
  amount: number;
  currency: string;
  billingCycle: CompanyBillingCycle;
  status: CompanySubscriptionStatus;
  nextBillingDate: string | null;
  accountReference: string | null;
  usageScope: 'company' | 'employee';
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  createdAt: string;
}

export type CompanySubscriptionInput = Omit<CompanySubscription, 'id' | 'createdAt'>;

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface CompanyInvoice {
  id: string;
  subscriptionId: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  vendor: string;
  description: string;
  amount: number;
  currency: string;
  generatedByName: string;
  usedByName: string;
  notes: string;
  status: 'draft' | 'submitted' | 'claimed' | 'paid' | 'cancelled';
  createdAt: string;
  deletedAt: string | null;
  permanentDeleteAt: string | null;
}

export type CompanyInvoiceInput = Omit<CompanyInvoice, 'id' | 'status' | 'createdAt' | 'deletedAt' | 'permanentDeleteAt'>;

async function request<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
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
    throw new Error(error.message || response.statusText || 'Request failed');
  }
  return response.json() as Promise<T>;
}

export const adminCompanySubscriptionsService = {
  listCurrencies: () => request<ApiResponse<Currency[]>>(
    'GET',
    API_ENDPOINTS.admin.currencies,
  ).then((r) => r.data),
  list: () => request<ApiResponse<CompanySubscription[]>>(
    'GET',
    API_ENDPOINTS.admin.companySubscriptions,
  ).then((r) => r.data),
  create: (input: CompanySubscriptionInput) => request<ApiResponse<CompanySubscription>>(
    'POST',
    API_ENDPOINTS.admin.companySubscriptions,
    input,
  ).then((r) => r.data),
  update: (id: string, input: Partial<CompanySubscriptionInput>) => request<ApiResponse<CompanySubscription>>(
    'PATCH',
    API_ENDPOINTS.admin.companySubscriptionById(id),
    input,
  ).then((r) => r.data),
  listInvoices: () => request<ApiResponse<CompanyInvoice[]>>(
    'GET',
    API_ENDPOINTS.admin.companyInvoices,
  ).then((r) => r.data),
  listDeletedInvoices: () => request<ApiResponse<CompanyInvoice[]>>(
    'GET',
    `${API_ENDPOINTS.admin.companyInvoices}?deleted=true`,
  ).then((r) => r.data),
  createInvoice: (input: CompanyInvoiceInput) => request<ApiResponse<CompanyInvoice>>(
    'POST',
    API_ENDPOINTS.admin.companyInvoices,
    input,
  ).then((r) => r.data),
  deleteInvoice: (id: string) => request<ApiResponse<{ id: string }>>(
    'DELETE',
    API_ENDPOINTS.admin.companyInvoiceById(id),
  ).then((r) => r.data),
  restoreInvoice: (id: string) => request<ApiResponse<CompanyInvoice>>(
    'POST',
    API_ENDPOINTS.admin.restoreCompanyInvoice(id),
  ).then((r) => r.data),
};
