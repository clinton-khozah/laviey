const OAUTH_API_KEY = 'lavey_oauth_api';
const OAUTH_FRONTEND_KEY = 'lavey_oauth_frontend';
const OAUTH_CLIENT_KEY = 'lavey_oauth_client';

export function stashOAuthRedirectContext(
  apiBaseUrl: string,
  frontendOrigin: string,
  client?: string,
): void {
  sessionStorage.setItem(OAUTH_API_KEY, apiBaseUrl.replace(/\/$/, ''));
  sessionStorage.setItem(OAUTH_FRONTEND_KEY, frontendOrigin);
  if (client) {
    sessionStorage.setItem(OAUTH_CLIENT_KEY, client);
  } else {
    sessionStorage.removeItem(OAUTH_CLIENT_KEY);
  }
}

export function readOAuthRedirectContext(): {
  apiBaseUrl: string | null;
  frontendOrigin: string | null;
  client: string | null;
} {
  return {
    apiBaseUrl: sessionStorage.getItem(OAUTH_API_KEY),
    frontendOrigin: sessionStorage.getItem(OAUTH_FRONTEND_KEY),
    client: sessionStorage.getItem(OAUTH_CLIENT_KEY),
  };
}

export function clearOAuthRedirectContext(): void {
  sessionStorage.removeItem(OAUTH_API_KEY);
  sessionStorage.removeItem(OAUTH_FRONTEND_KEY);
  sessionStorage.removeItem(OAUTH_CLIENT_KEY);
}

export function isLocalApiBaseUrl(apiBaseUrl: string): boolean {
  try {
    const host = new URL(apiBaseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2';
  } catch {
    return false;
  }
}

export function isLocalBrowserOrigin(): boolean {
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.origin === 'https://localhost' ||
    window.location.origin === 'capacitor://localhost'
  );
}
