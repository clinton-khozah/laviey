import { GoogleSignin } from '@react-native-google-signin/google-signin';

/**
 * Web client in the same Google project as this Android app's signing certificates.
 * Public — not a secret.
 */
export const GOOGLE_WEB_CLIENT_ID =
  '932812160359-t7hnq6svmg97k4ro94re3h05l0c24qum.apps.googleusercontent.com';

let configuredFor: string | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensurePlayServices(showUpdateDialog: boolean): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: showUpdateDialog && attempt === 2,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await sleep(1200 * (attempt + 1));
    }
  }
  throw lastError;
}

export function configureGoogleSignIn(): void {
  if (configuredFor === GOOGLE_WEB_CLIENT_ID || !GOOGLE_WEB_CLIENT_ID) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
    forceCodeForRefreshToken: false,
  });
  configuredFor = GOOGLE_WEB_CLIENT_ID;
}

export async function getGoogleIdTokenSilently(): Promise<string | null> {
  configureGoogleSignIn();
  try {
    await ensurePlayServices(false);
  } catch {
    return null;
  }

  try {
    const cached = await GoogleSignin.signInSilently();
    if (cached.type === 'success' && cached.data.idToken) {
      return cached.data.idToken;
    }
  } catch {
    // No cached Google session on this device.
  }

  return null;
}

export async function getGoogleIdToken(): Promise<string | null> {
  configureGoogleSignIn();
  await ensurePlayServices(true);

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await GoogleSignin.signIn();
      if (result.type !== 'success') return null;

      if (result.data.idToken) return result.data.idToken;

      const tokens = await GoogleSignin.getTokens();
      if (tokens.idToken) return tokens.idToken;

      throw new Error('Google did not return a sign-in token.');
    } catch (error) {
      lastError = error;
      const code = (error as { code?: string | number })?.code;
      if ((code === 7 || code === '7') && attempt === 0) {
        await sleep(1500);
        continue;
      }
      break;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Google did not return a sign-in token.');
}
