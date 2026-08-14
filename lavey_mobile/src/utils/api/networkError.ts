const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://laveybackend-3.onrender.com/api').replace(/\/$/, '');

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/refresh',
  '/onboarding/questions',
  '/meta/access-mode',
];

export function isPublicAuthPath(url: string | undefined): boolean {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.some((path) => url === path || url.endsWith(path));
}

export function networkErrorMessage(): string {
  if (/10\.0\.2\.2|localhost|127\.0\.0\.1/i.test(API_BASE_URL)) {
    return `Cannot reach the API at ${API_BASE_URL}. Make sure lavey-backend is running (npm run dev in lavey-backend) and reload the app.`;
  }
  return 'Cannot reach the Lavey servers. Check your internet connection and try again.';
}

export function googleSignInErrorMessage(error: unknown): string {
  const code = (error as { code?: string | number })?.code;
  if (code === 7 || code === '7') {
    return 'Google Play Services could not connect. Try again, restart your phone, or use email sign-in below.';
  }
  if (code === 10 || code === '10') {
    return 'Google Sign-In is not configured for this Android build. The app package and signing certificate must be registered in Google Cloud Console.';
  }
  const message = error instanceof Error ? error.message : '';
  if (message.includes('did not return a sign-in token') || message.includes('idToken')) {
    return 'Google Sign-In could not issue a secure token for this build. Please update to the latest app version.';
  }
  return message || 'Please try again.';
}
