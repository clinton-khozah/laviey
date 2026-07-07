import { Capacitor } from '@capacitor/core';
import { isNativeMobileApp } from '@/utils/mobile/isNativeMobileApp';

/** Deep link — used when OAuth opens in external Chrome. */
export const NATIVE_DEEP_LINK_ORIGIN = 'app.loviey.mobile://auth';

export const CAPACITOR_WEB_ORIGIN = 'https://localhost';

export function getNativeOAuthParams(): { origin: string; client: string } {
  if (!isNativeMobileApp()) {
    return { origin: window.location.origin, client: 'web' };
  }

  if (Capacitor.getPlatform() === 'ios') {
    return { origin: 'capacitor://localhost', client: 'capacitor-ios' };
  }

  // Keep Google OAuth inside the app WebView (see capacitor.config allowNavigation).
  return { origin: CAPACITOR_WEB_ORIGIN, client: 'capacitor-android' };
}

export function isNativeOAuthCallbackUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.origin === CAPACITOR_WEB_ORIGIN && parsed.pathname === '/auth/callback') {
      return true;
    }
    return (
      parsed.pathname === '/callback' ||
      parsed.pathname.endsWith('/auth/callback') ||
      parsed.host === 'auth'
    );
  } catch {
    return false;
  }
}

/** Route OAuth return URLs into the SPA auth callback route. */
export function handleNativeOAuthReturnUrl(rawUrl: string): void {
  if (!isNativeOAuthCallbackUrl(rawUrl)) return;

  try {
    const parsed = new URL(rawUrl);
    const target = `/auth/callback${parsed.search}`;
    if (`${window.location.pathname}${window.location.search}` === target) return;

    window.history.replaceState(null, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch {
    /* ignore malformed URLs */
  }
}
