/**
 * Centralized environment configuration.
 * All `import.meta.env` access should go through this module.
 */
const DEFAULT_PRODUCTION_API_BASE_URL = 'https://laveybackend-3.onrender.com/api';
const DEFAULT_SUPABASE_URL = 'https://wgyqotbvjnkafmwmhvbj.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_F9_1U8m0og8iS3tQmBD6YQ_xV-AVFlL';

const LOCAL_API_HOST_PATTERN = /localhost|127\.0\.0\.1|10\.0\.2\.2/i;
const PLACEHOLDER_KEY_PATTERN = /^your_/i;

function isLocalApiUrl(url: string): boolean {
  return LOCAL_API_HOST_PATTERN.test(url);
}

function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '').trim();
  if (fromEnv && !(import.meta.env.PROD && isLocalApiUrl(fromEnv))) return fromEnv;
  if (import.meta.env.DEV) return 'http://localhost:5000/api';
  return DEFAULT_PRODUCTION_API_BASE_URL;
}

function resolveSupabasePublishableKey(): string {
  const fromEnv = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (fromEnv && !PLACEHOLDER_KEY_PATTERN.test(fromEnv)) return fromEnv;
  return DEFAULT_SUPABASE_PUBLISHABLE_KEY;
}

const apiBaseUrl = resolveApiBaseUrl();

if (import.meta.env.DEV) {
  console.info(`[Lavey] API base URL: ${apiBaseUrl}`);
}

export const env = {
  /** Must be a full URL in production (Netlify cannot run lavey_backend). */
  apiBaseUrl,
  /** Set VITE_USE_MOCK_API=true only for offline UI demos. Production uses the real API. */
  useMockApi: import.meta.env.VITE_USE_MOCK_API === 'true',
  /** Real Supabase auth via lavey_backend (default on). */
  useRealAuth: import.meta.env.VITE_USE_REAL_AUTH !== 'false',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL,
  supabasePublishableKey: resolveSupabasePublishableKey(),
  /** Optional TURN relay — improves connectivity across strict NATs/firewalls */
  turnUrl: import.meta.env.VITE_TURN_URL?.trim() || '',
  turnUsername: import.meta.env.VITE_TURN_USERNAME?.trim() || '',
  turnCredential: import.meta.env.VITE_TURN_CREDENTIAL?.trim() || '',
  isDev: import.meta.env.DEV,
} as const;

export function usesBackendApi(): boolean {
  return !env.useMockApi;
}

export function usesBackendAuth(): boolean {
  return env.useRealAuth && usesBackendApi();
}

/** Online meetups require auth and use Supabase-backed routes in lavey_backend. */
export function usesBackendMeetups(): boolean {
  return usesBackendAuth();
}

export function hasSupabaseRealtime(): boolean {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}
