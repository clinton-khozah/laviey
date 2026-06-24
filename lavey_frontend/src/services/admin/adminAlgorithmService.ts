import { apiConfig } from '@/config/api.config';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { getAdminSession } from '@/features/admin/session/adminSession';
import type {
  AlgorithmDefinition,
  AlgorithmId,
  PlatformOverview,
  ResultsWindow,
} from '@/features/admin/components/AdminAlgorithmOverseer/adminAlgorithmOverseer.data';
import type { ApiResponse } from '@/types';

export interface AlgorithmTrendSeries {
  label: string;
  matches: number[];
  registrations: number[];
  hours: number[];
}

export interface AppliedAlgorithm {
  id: AlgorithmId;
  name: string;
  codename: string;
  appliedAt: string;
  feedBanner: string;
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
      ...adminHeaders(),
    },
  });

  if (!response.ok) await parseError(response);
  return response.json() as Promise<T>;
}

export const adminAlgorithmService = {
  listAlgorithms(): Promise<AlgorithmDefinition[]> {
    return adminRequest<ApiResponse<AlgorithmDefinition[]>>('GET', API_ENDPOINTS.admin.algorithms).then(
      (res) => res.data,
    );
  },

  getOverview(window: ResultsWindow = '30d'): Promise<PlatformOverview> {
    return adminRequest<ApiResponse<PlatformOverview>>('GET', API_ENDPOINTS.admin.algorithmsOverview, {
      window,
    }).then((res) => res.data);
  },

  getTrend(slug: AlgorithmId): Promise<AlgorithmTrendSeries> {
    return adminRequest<ApiResponse<AlgorithmTrendSeries>>('GET', API_ENDPOINTS.admin.algorithmTrend(slug)).then(
      (res) => res.data,
    );
  },

  getActive(): Promise<AppliedAlgorithm | null> {
    return adminRequest<ApiResponse<AppliedAlgorithm | null>>('GET', API_ENDPOINTS.admin.algorithmsActive).then(
      (res) => res.data,
    );
  },

  activate(slug: AlgorithmId): Promise<AppliedAlgorithm> {
    return adminRequest<ApiResponse<AppliedAlgorithm>>('POST', API_ENDPOINTS.admin.algorithmActivate(slug)).then(
      (res) => res.data,
    );
  },
};
