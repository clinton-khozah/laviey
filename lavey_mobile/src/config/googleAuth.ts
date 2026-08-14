import Constants from 'expo-constants';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

/** Web OAuth client ID (same project as lavey-backend + website). Public — not a secret. */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()
  || (Constants.expoConfig?.extra?.googleWebClientId as string | undefined)?.trim()
  || '17132674984-klaq75k8d7k6kc0ke76d0dhp85bor8hd.apps.googleusercontent.com';

let configured = false;

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
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
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
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    const cached = await GoogleSignin.signInSilently();
    if (cached.type === 'success' && cached.data.idToken) {
      return cached.data.idToken;
    }
  } catch {
    // No cached Google session — open the account picker.
  }

  const result = await GoogleSignin.signIn();
  if (result.type !== 'success') return null;

  if (result.data.idToken) return result.data.idToken;

  try {
    const tokens = await GoogleSignin.getTokens();
    if (tokens.idToken) return tokens.idToken;
  } catch {
    // Fall through — likely missing web client ID or SHA-1 mismatch in Google Cloud Console.
  }

  throw new Error('Google did not return a sign-in token.');
}
