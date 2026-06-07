import type { AdminAccount, AdminAuthSession } from '@/types/domain/adminAuth.types';

const ADMIN_TOKEN_KEY = 'lavey_admin_token';
const ADMIN_USER_KEY = 'lavey_admin_user';
/** @deprecated Removed in favor of JWT session; cleared on boot. */
const LEGACY_ADMIN_SESSION_KEY = 'lavey_admin_session_v1';

export function clearLegacyAdminSession(): void {
  localStorage.removeItem(LEGACY_ADMIN_SESSION_KEY);
}

clearLegacyAdminSession();

export function getAdminSession(): AdminAuthSession | null {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const rawUser = localStorage.getItem(ADMIN_USER_KEY);
  if (!token || !rawUser) return null;

  try {
    const admin = JSON.parse(rawUser) as AdminAccount;
    if (!admin?.id || !admin.email) return null;
    return { token, admin };
  } catch {
    return null;
  }
}

export function hasAdminSession(): boolean {
  return Boolean(getAdminSession()?.token);
}

export function persistAdminSession(session: AdminAuthSession): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, session.token);
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(session.admin));
}

export function clearAdminSession(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  clearLegacyAdminSession();
}
