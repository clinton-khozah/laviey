export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  provider: 'google' | 'email';
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

/** Register response when email confirmation is required before a session is issued. */
export interface EmailAuthResponse {
  needsEmailVerification: boolean;
  email: string;
  token?: string;
  user?: AuthUser;
}
