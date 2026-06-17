import { apiConfig } from "@/config/api.config";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { emitSessionExpired } from "@/utils/auth/authSessionEvents";
import { toApiNetworkError } from "@/utils/api/networkError";
import { maybeNavigateToErrorPage } from "@/utils/navigation/errorNavigation";
import { sanitizeAuthErrorMessage } from "@/utils/errors/userFacingErrorMessage";
import type { ApiErrorBody } from "@/types";
import { ApiError } from "./apiError";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  /** Optional calls (e.g. photo compliment) should fail quietly without /error navigation */
  skipErrorPage?: boolean;
}

interface PostFormOptions {
  signal?: AbortSignal;
  skipErrorPage?: boolean;
}

function buildUrl(path: string, params?: RequestConfig["params"]): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${apiConfig.baseUrl}${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  let code = `HTTP_${response.status}`;
  let message = response.statusText || "Request failed";
  let details: unknown;

  try {
    const body = (await response.json()) as ApiErrorBody;
    code = body.code ?? code;
    message = body.message ?? message;
    details = body.details;
  } catch {
    /* non-JSON error body */
  }

  if (response.status === 401 || code === "SESSION_EXPIRED") {
    message = sanitizeAuthErrorMessage(message);
    if (code === "UNAUTHORIZED" && message.includes("expired")) {
      code = "SESSION_EXPIRED";
    }
  }

  return new ApiError(response.status, code, message, details);
}

async function request<T>(
  method: HttpMethod,
  path: string,
  config: RequestConfig = {},
): Promise<T> {
  const headers: HeadersInit = {
    Accept: "application/json",
    ...config.headers,
  };

  if (config.body !== undefined) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const hasAuthHeader = Boolean(
    (headers as Record<string, string>).Authorization,
  );
  if (!hasAuthHeader) {
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, config.params), {
      method,
      headers,
      body: config.body !== undefined ? JSON.stringify(config.body) : undefined,
      signal: config.signal,
    });
  } catch (err) {
    const networkError = toApiNetworkError(err);
    if (networkError) throw networkError;
    throw err;
  }

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    const hadStoredToken = Boolean(localStorage.getItem(STORAGE_KEYS.authToken));
    const isAuthAttempt =
      path.includes("/auth/login") ||
      path.includes("/auth/register") ||
      path.includes("/auth/google") ||
      path.includes("/auth/verify");

    if (
      hadStoredToken &&
      !isAuthAttempt &&
      (response.status === 401 ||
        error.code === "SESSION_EXPIRED" ||
        error.code === "UNAUTHORIZED")
    ) {
      emitSessionExpired();
    }

    if (!config.skipErrorPage) {
      maybeNavigateToErrorPage(error);
    }
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const preview = (await response.text()).trimStart().slice(0, 40);
    if (preview.startsWith("<")) {
      throw new ApiError(
        502,
        "INVALID_API_RESPONSE",
        "The app called your Netlify site instead of the API. Set VITE_API_BASE_URL to https://laveybackend-3.onrender.com/api on Netlify, then redeploy.",
      );
    }
    throw new ApiError(
      502,
      "INVALID_API_RESPONSE",
      "API returned a non-JSON response.",
    );
  }

  return response.json() as Promise<T>;
}

async function postForm<T>(
  path: string,
  formData: FormData,
  options?: PostFormOptions,
): Promise<T> {
  const headers: HeadersInit = {
    Accept: "application/json",
  };

  const hasAuthHeader = Boolean(
    (headers as Record<string, string>).Authorization,
  );
  if (!hasAuthHeader) {
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: "POST",
      headers,
      body: formData,
      signal: options?.signal,
    });
  } catch (err) {
    const networkError = toApiNetworkError(err);
    if (networkError) throw networkError;
    throw err;
  }

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    const hadStoredToken = Boolean(localStorage.getItem(STORAGE_KEYS.authToken));

    if (
      hadStoredToken &&
      (response.status === 401 ||
        error.code === "SESSION_EXPIRED" ||
        error.code === "UNAUTHORIZED")
    ) {
      emitSessionExpired();
    }

    if (!options?.skipErrorPage) {
      maybeNavigateToErrorPage(error);
    }
    throw error;
  }

  return response.json() as Promise<T>;
}

/** Typed HTTP client for all service modules */
export const httpClient = {
  get: <T>(path: string, config?: RequestConfig) =>
    request<T>("GET", path, config),
  post: <T>(path: string, config?: RequestConfig) =>
    request<T>("POST", path, config),
  postForm: <T>(path: string, formData: FormData, options?: PostFormOptions) =>
    postForm<T>(path, formData, options),
  put: <T>(path: string, config?: RequestConfig) =>
    request<T>("PUT", path, config),
  patch: <T>(path: string, config?: RequestConfig) =>
    request<T>("PATCH", path, config),
  delete: <T>(path: string, config?: RequestConfig) =>
    request<T>("DELETE", path, config),
};
