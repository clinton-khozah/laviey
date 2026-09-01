import Constants from 'expo-constants';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

/** Web OAuth client ID (same project as lavey-backend + website). Public — not a secret. */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()
  || (Constants.expoConfig?.extra?.googleWebClientId as string | undefined)?.trim()
  || '17132674984-klaq75k8d7k6kc0ke76d0dhp85bor8hd.apps.googleusercontent.com';

let configured = false;

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
  if (configured || !GOOGLE_WEB_CLIENT_ID) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
    forceCodeForRefreshToken: false,
  });
  configured = true;
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

  try {
    const tokens = await GoogleSignin.getTokens();
    if (tokens.idToken) return tokens.idToken;
  } catch {
    return null;
  }

  return null;
}

export async function getGoogleIdToken(): Promise<string | null> {
  configureGoogleSignIn();
  await ensurePlayServices(true);

  try {
    const cached = await GoogleSignin.signInSilently();
    if (cached.type === 'success' && cached.data.idToken) {
      return cached.data.idToken;
    }
  } catch {
    // No cached Google session — open the account picker.
  }

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
