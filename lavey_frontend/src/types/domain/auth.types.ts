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

export interface EmailSignInRequest {
  email: string;
  password: string;
}

export interface EmailSignUpRequest extends EmailSignInRequest {
  displayName: string;
}

export interface EmailAuthResponse {
  needsEmailVerification: boolean;
  email: string;
  token?: string;
  user?: AuthUser;
}

export type EmailSignUpResult =
  | AuthSession
  | { needsEmailVerification: true; email: string };

export interface VerifyEmailRequest {
  email: string;
  code: string;
}
