import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.js';
import { createSupabaseUserClient } from '../lib/supabase.user.js';
import { AppError } from '../utils/appError.js';
import {
  isSessionExpiredMessage,
  toUserFacingAuthMessage,
} from '../utils/sessionErrorMessage.js';
import type { AuthSession, AuthUser, EmailAuthResponse } from '../types/api.types.js';

function mapSupabaseUser(user: User): AuthUser {
  const metadata = user.user_metadata ?? {};
  const provider = user.app_metadata?.provider === 'google' ? 'google' : 'email';

  return {
    id: user.id,
    email: user.email ?? '',
    displayName:
      (metadata.full_name as string | undefined) ??
      (metadata.name as string | undefined) ??
      user.email?.split('@')[0] ??
      'User',
    avatarUrl: (metadata.avatar_url as string | undefined) ?? (metadata.picture as string | undefined),
    provider,
  };
}

export function mapSession(session: Session): AuthSession {
  return {
    token: session.access_token,
    user: mapSupabaseUser(session.user),
  };
}

export async function signInWithGoogleIdToken(idToken: string): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error || !data.session) {
    throw new AppError(401, 'GOOGLE_SIGN_IN_FAILED', error?.message ?? 'Google sign-in failed');
  }

  return mapSession(data.session);
}

function isEmailNotConfirmed(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('email not confirmed') || lower.includes('not confirmed');
}

function isEmailRateLimited(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('once every') ||
    lower.includes('over_email_send_rate_limit')
  );
}

function isAlreadyRegistered(message: string): boolean {
  return message.toLowerCase().includes('already registered');
}

function throwAuthEmailError(code: string, message: string): never {
  if (isEmailRateLimited(message)) {
    throw new AppError(
      429,
      'EMAIL_RATE_LIMIT',
      'Too many verification emails sent. Wait about an hour, or use the code from your latest email.',
    );
  }
  throw new AppError(400, code, message);
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSession> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.session) {
    const message = error?.message ?? 'Invalid email or password';
    if (isEmailNotConfirmed(message)) {
      throw new AppError(
        401,
        'EMAIL_CONFIRMATION_REQUIRED',
        'Enter the verification code we sent to your email.',
      );
    }
    throw new AppError(401, 'EMAIL_SIGN_IN_FAILED', message);
  }

  return mapSession(data.session);
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<EmailAuthResponse> {
  const normalizedEmail = email.trim().toLowerCase();
  const name = displayName.trim() || normalizedEmail.split('@')[0] || 'User';

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: name,
        name,
      },
    },
  });

  if (error) {
    if (isAlreadyRegistered(error.message)) {
      return {
        needsEmailVerification: true,
        email: normalizedEmail,
      };
    }
    if (isEmailRateLimited(error.message)) {
      throw new AppError(
        429,
        'EMAIL_RATE_LIMIT',
        'Too many verification emails sent. Wait about an hour, or use the code from your latest email.',
      );
    }
    throw new AppError(400, 'EMAIL_SIGN_UP_FAILED', error.message);
  }

  if (!data.session) {
    return {
      needsEmailVerification: true,
      email: normalizedEmail,
    };
  }

  const session = mapSession(data.session);
  return {
    needsEmailVerification: false,
    email: normalizedEmail,
    token: session.token,
    user: session.user,
  };
}

export async function verifyEmailWithCode(email: string, code: string): Promise<AuthSession> {
  const normalizedEmail = email.trim().toLowerCase();
  const token = code.replace(/\s/g, '');

  if (!/^\d{6,8}$/.test(token)) {
    throw new AppError(400, 'EMAIL_VERIFICATION_FAILED', 'Enter the 6-digit code from your email.');
  }

  const attempts: Array<{ type: 'signup' | 'email' }> = [{ type: 'signup' }, { type: 'email' }];
  let lastError: string | undefined;

  for (const attempt of attempts) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token,
      type: attempt.type,
    });

    if (!error && data.session) {
      return mapSession(data.session);
    }

    lastError = error?.message;
  }

  throw new AppError(
    400,
    'EMAIL_VERIFICATION_FAILED',
    lastError ?? 'Invalid or expired verification code',
  );
}

export async function resendEmailVerification(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: normalizedEmail,
  });

  if (error) {
    throwAuthEmailError('EMAIL_RESEND_FAILED', error.message);
  }
}

export async function getAuthUserFromAccessToken(accessToken: string): Promise<AuthUser> {
  try {
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      const raw = error?.message ?? 'Invalid or expired token';
      const code = isSessionExpiredMessage(raw) ? 'SESSION_EXPIRED' : 'UNAUTHORIZED';
      throw new AppError(401, code, toUserFacingAuthMessage(raw));
    }

    return mapSupabaseUser(data.user);
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err instanceof Error ? err.message : 'Auth service unavailable';
    throw new AppError(503, 'AUTH_SERVICE_UNAVAILABLE', message);
  }
}

/** Client-side token clearing is sufficient without a service-role key. */
export async function signOutAccessToken(_accessToken: string): Promise<void> {
  return;
}

export async function changeUserPassword(
  authUser: AuthUser,
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (authUser.provider === 'google') {
    throw new AppError(
      400,
      'OAUTH_ACCOUNT',
      'This account uses Google sign-in. Change your password in your Google account settings.',
    );
  }

  const normalizedEmail = authUser.email.trim().toLowerCase();
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: currentPassword,
  });

  if (verifyError) {
    throw new AppError(401, 'INVALID_PASSWORD', 'Current password is incorrect');
  }

  const userClient = createSupabaseUserClient(accessToken);
  const { error } = await userClient.auth.updateUser({ password: newPassword });

  if (error) {
    throw new AppError(400, 'PASSWORD_UPDATE_FAILED', error.message);
  }
}
