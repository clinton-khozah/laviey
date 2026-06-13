import { env } from '@/config/env';
import './googleGsi.types';

const GSI_SCRIPT = 'https://accounts.google.com/gsi/client';

let gsiScriptPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!gsiScriptPromise) {
    gsiScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google sign-in failed to load.'));
      document.head.appendChild(script);
    });
  }

  return gsiScriptPromise;
}

/**
 * Local dev helper — returns a Google ID token without Supabase redirect / PKCE.
 * Requires http://localhost:3000 in Google Cloud → Authorized JavaScript origins.
 */
export async function requestGoogleIdToken(): Promise<string> {
  const clientId = env.googleClientId.trim();
  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not set.');
  }

  await loadGsiScript();

  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    const cleanup = () => {
      container.remove();
    };

    window.google!.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      callback: (response) => {
        cleanup();
        if (response.credential) {
          resolve(response.credential);
          return;
        }
        reject(new Error('Google did not return a sign-in token.'));
      },
    });

    window.google!.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
    });

    window.setTimeout(() => {
      const button = container.querySelector('[role="button"]') as HTMLElement | null;
      if (!button) {
        cleanup();
        reject(
          new Error(
            'Could not open Google sign-in. Add http://localhost:3000 to Authorized JavaScript origins in Google Cloud Console.',
          ),
        );
        return;
      }
      button.click();
    }, 50);
  });
}
