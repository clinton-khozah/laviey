import { apiConfig } from '@/config/api.config';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { getAdminSession } from '@/features/admin/session/adminSession';
import type { ApiResponse } from '@/types';

export type EmploymentStatus = 'active' | 'on_leave' | 'probation' | 'terminated';
export type ClaimType =
  | 'annual_leave'
  | 'sick_leave'
  | 'unpaid_leave'
  | 'family_leave'
  | 'remote_work'
  | 'expense'
  | 'equipment'
  | 'training'
  | 'company_expense'
  | 'other';

export const LEAVE_CLAIM_TYPES: ClaimType[] = [
  'annual_leave',
  'sick_leave',
  'unpaid_leave',
  'family_leave',
  'remote_work',
];

export const EXPENSE_CLAIM_TYPES: ClaimType[] = [
  'expense',
  'equipment',
  'training',
  'company_expense',
  'other',
];

export function isLeaveClaimType(type: ClaimType): boolean {
  return LEAVE_CLAIM_TYPES.includes(type);
}

export function isExpenseClaimType(type: ClaimType): boolean {
  return EXPENSE_CLAIM_TYPES.includes(type);
}
export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface HrOverview {
  totalEmployees: number;
  activeEmployees: number;
  onLeave: number;
  pendingLeaves: number;
  pendingClaims: number;
  rolesCount: number;
  monthlyPayroll: number;
}

export interface EmployeeRole {
  id: string;
  slug: string;
  name: string;
  description: string;
  department: string;
  permissions: string[];
  isActive: boolean;
  employeeCount: number;
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  roleId: string;
  roleName: string;
  department: string;
  jobTitle: string | null;
  employmentStatus: EmploymentStatus;
  salary: number;
  currency: string;
  startDate: string | null;
  leaveBalanceDays: number;
  notes: string | null;
  createdAt: string;
}

export interface HrDocumentExtracted {
  title?: string;
  vendor?: string;
  amount?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  daysRequested?: number;
  description?: string;
  invoiceNumber?: string;
}

export interface HrDocumentAnalysis {
  source: 'ai' | 'unavailable';
  documentType: string;
  matchesClaimType: boolean;
  matchConfidence: number;
  matchReason: string;
  extracted: HrDocumentExtracted;
  fileName?: string;
  mimeType?: string;
}

export interface EmployeeClaim {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  claimType: ClaimType;
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  daysRequested: number | null;
  amount: number | null;
  currency: string;
  status: ClaimStatus;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  attachmentFileName: string | null;
  attachmentMimeType: string | null;
  documentAnalysis: HrDocumentAnalysis | null;
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
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
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

async function adminFormRequest<T>(path: string, formData: FormData): Promise<T> {
  const base = path.startsWith('/') ? path : `/${path}`;
  const url = `${apiConfig.baseUrl}${base}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: adminHeaders(),
    body: formData,
  });
  if (!response.ok) await parseError(response);
  return response.json() as Promise<T>;
}

export const adminHrService = {
  getOverview(): Promise<HrOverview> {
    return adminRequest<ApiResponse<HrOverview>>('GET', API_ENDPOINTS.admin.hrOverview).then((r) => r.data);
  },

  listRoles(): Promise<EmployeeRole[]> {
    return adminRequest<ApiResponse<EmployeeRole[]>>('GET', API_ENDPOINTS.admin.hrRoles).then((r) => r.data);
  },

  createRole(input: {
    name: string;
    description?: string;
    department: string;
    permissions?: string[];
  }): Promise<EmployeeRole> {
    return adminRequest<ApiResponse<EmployeeRole>>('POST', API_ENDPOINTS.admin.hrRoles, input).then((r) => r.data);
  },

  updateRole(
    id: string,
    input: Partial<{
      name: string;
      description: string;
      department: string;
      permissions: string[];
      isActive: boolean;
    }>,
  ): Promise<EmployeeRole> {
    return adminRequest<ApiResponse<EmployeeRole>>('PATCH', API_ENDPOINTS.admin.hrRoleById(id), input).then(
      (r) => r.data,
    );
  },

  deleteRole(id: string): Promise<void> {
    return adminRequest<ApiResponse<{ id: string }>>('DELETE', API_ENDPOINTS.admin.hrRoleById(id)).then(() => undefined);
  },

  listEmployees(): Promise<Employee[]> {
    return adminRequest<ApiResponse<Employee[]>>('GET', API_ENDPOINTS.admin.hrEmployees).then((r) => r.data);
  },

  createEmployee(input: {
    fullName: string;
    email: string;
    phone?: string;
    roleId: string;
    jobTitle?: string;
    department?: string;
    startDate?: string;
    salary: number;
    leaveBalanceDays?: number;
    notes?: string;
  }): Promise<Employee> {
    return adminRequest<ApiResponse<Employee>>('POST', API_ENDPOINTS.admin.hrEmployees, input).then((r) => r.data);
  },

  updateEmployee(
    id: string,
    input: Partial<{
      fullName: string;
      email: string;
      phone: string;
      roleId: string;
      jobTitle: string;
      department: string;
      employmentStatus: EmploymentStatus;
      startDate: string;
      salary: number;
      leaveBalanceDays: number;
      notes: string;
    }>,
  ): Promise<Employee> {
    return adminRequest<ApiResponse<Employee>>('PATCH', API_ENDPOINTS.admin.hrEmployeeById(id), input).then(
      (r) => r.data,
    );
  },

  listClaims(status?: ClaimStatus): Promise<EmployeeClaim[]> {
    return adminRequest<ApiResponse<EmployeeClaim[]>>(
      'GET',
      API_ENDPOINTS.admin.hrClaims,
      undefined,
      status ? { status } : undefined,
    ).then((r) => r.data);
  },

  createClaim(input: {
    employeeId: string;
    claimType: ClaimType;
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    daysRequested?: number;
    amount?: number;
    attachmentFileName?: string;
    attachmentMimeType?: string;
    documentAnalysis?: HrDocumentAnalysis;
  }): Promise<EmployeeClaim> {
    return adminRequest<ApiResponse<EmployeeClaim>>('POST', API_ENDPOINTS.admin.hrClaims, input).then((r) => r.data);
  },

  analyzeClaimDocument(file: File, claimType: ClaimType): Promise<HrDocumentAnalysis> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('claimType', claimType);
    return adminFormRequest<ApiResponse<HrDocumentAnalysis>>(
      API_ENDPOINTS.admin.hrClaimAnalyzeDocument,
      formData,
    ).then((r) => r.data);
  },

  reviewClaim(id: string, status: 'approved' | 'rejected' | 'cancelled', adminNotes?: string): Promise<EmployeeClaim> {
    return adminRequest<ApiResponse<EmployeeClaim>>('POST', API_ENDPOINTS.admin.hrClaimReview(id), {
      status,
      adminNotes,
    }).then((r) => r.data);
  },
};
