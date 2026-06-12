const OAUTH_API_KEY = 'lavey_oauth_api';
const OAUTH_FRONTEND_KEY = 'lavey_oauth_frontend';

export function stashOAuthRedirectContext(apiBaseUrl: string, frontendOrigin: string): void {
  sessionStorage.setItem(OAUTH_API_KEY, apiBaseUrl.replace(/\/$/, ''));
  sessionStorage.setItem(OAUTH_FRONTEND_KEY, frontendOrigin);
}

export function readOAuthRedirectContext(): {
  apiBaseUrl: string | null;
  frontendOrigin: string | null;
} {
  return {
    apiBaseUrl: sessionStorage.getItem(OAUTH_API_KEY),
    frontendOrigin: sessionStorage.getItem(OAUTH_FRONTEND_KEY),
  };
}

export function clearOAuthRedirectContext(): void {
  sessionStorage.removeItem(OAUTH_API_KEY);
  sessionStorage.removeItem(OAUTH_FRONTEND_KEY);
}

export function isLocalApiBaseUrl(apiBaseUrl: string): boolean {
  try {
    const host = new URL(apiBaseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

export function isLocalBrowserOrigin(): boolean {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}
