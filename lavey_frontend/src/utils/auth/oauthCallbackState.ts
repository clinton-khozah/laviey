/** Supabase may land on `/` with ?code= instead of /auth/callback. */
export function hasOAuthReturnParams(search = window.location.search, hash = window.location.hash): boolean {
  const query = new URLSearchParams(search);
  if (query.get('code') || query.get('token') || query.get('error')) return true;

  const hashBody = hash.replace(/^#/, '');
  if (!hashBody) return false;
  return Boolean(new URLSearchParams(hashBody).get('access_token'));
}

/** Dedupes Strict Mode double-invoke and in-flight retries for the same token. */
let oauthCallbackPromise: Promise<void> | null = null;
let oauthCallbackToken: string | null = null;

export function resetOAuthCallbackState(): void {
  oauthCallbackPromise = null;
  oauthCallbackToken = null;
}

export function getOAuthCallbackInFlight(token: string): Promise<void> | null {
  if (oauthCallbackToken === token && oauthCallbackPromise) {
    return oauthCallbackPromise;
  }
  return null;
}

export function trackOAuthCallback(token: string, promise: Promise<void>): void {
  oauthCallbackToken = token;
  oauthCallbackPromise = promise;
}

export function clearOAuthCallbackOnError(): void {
  oauthCallbackPromise = null;
  oauthCallbackToken = null;
}
