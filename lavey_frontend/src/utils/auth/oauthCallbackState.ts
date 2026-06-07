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
