interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        use_fedcm_for_prompt?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: { theme?: string; size?: string; type?: string; width?: number },
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

/** Opens Google's account picker and returns a signed ID token (JWT). */
export async function requestGoogleIdToken(clientId: string): Promise<string> {
  await loadGoogleIdentityScript();

  if (!window.google?.accounts?.id) {
    throw new Error('Google Sign-In is unavailable');
  }

  return new Promise((resolve, reject) => {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:10000;';

    const panel = document.createElement('div');
    panel.style.cssText =
      'background:#fff;border-radius:16px;padding:24px 28px;box-shadow:0 12px 40px rgba(0,0,0,0.2);text-align:center;';

    const title = document.createElement('p');
    title.textContent = 'Sign in with Google';
    title.style.cssText = 'margin:0 0 16px;font:600 16px/1.4 Outfit,sans-serif;color:#111;';

    const buttonHost = document.createElement('div');
    panel.append(title, buttonHost);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    let settled = false;

    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      overlay.remove();
      action();
    };

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        finish(() => reject(new Error('Google sign-in was cancelled')));
      }
    });

    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) {
          finish(() => resolve(response.credential!));
          return;
        }
        finish(() => reject(new Error('Google sign-in was cancelled')));
      },
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: false,
    });

    window.google!.accounts.id.renderButton(buttonHost, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      width: 280,
    });

    window.setTimeout(() => {
      if (!buttonHost.querySelector('div[role="button"]')) {
        finish(() =>
          reject(
            new Error(
              `Google blocked this app origin (${window.location.origin}). In Google Cloud Console → Credentials → your Web OAuth client → Authorized JavaScript origins, add exactly: ${window.location.origin}`,
            ),
          ),
        );
      }
    }, 4000);

    window.setTimeout(() => {
      finish(() => reject(new Error('Google sign-in timed out. Try again.')));
    }, 120_000);
  });
}
