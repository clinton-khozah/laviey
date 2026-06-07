/** Google Identity Services blocks embedded webviews (Cursor preview, VS Code Simple Browser, etc.). */
export function isEmbeddedWebView(): boolean {
  const ua = navigator.userAgent;

  if (/Cursor|Electron|SimpleBrowser|WebView|wv\)/i.test(ua)) {
    return true;
  }

  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function getGoogleSignInBlockedMessage(): string | null {
  if (!isEmbeddedWebView()) {
    return null;
  }

  return 'Google Sign-In does not work inside Cursor’s built-in browser. Open this app in Chrome, Edge, or Safari instead.';
}

export function getGoogleOriginMismatchHint(): string {
  const origin = window.location.origin;
  return `Add "${origin}" under Authorized JavaScript origins in Google Cloud Console (Credentials → your OAuth Web client). Redirect URIs are not needed for this sign-in method.`;
}
