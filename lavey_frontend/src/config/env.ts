/**
 * Centralized environment configuration.
 * All `import.meta.env` access should go through this module.
 */
const DEFAULT_PRODUCTION_API_BASE_URL = 'https://laveybackend-3.onrender.com/api';
const DEFAULT_SUPABASE_URL = 'https://wgyqotbvjnkafmwmhvbj.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_F9_1U8m0og8iS3tQmBD6YQ_xV-AVFlL';

function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '').trim();
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return 'http://localhost:5000/api';
  return DEFAULT_PRODUCTION_API_BASE_URL;
}

export const env = {
  /** Must be a full URL in production (Netlify cannot run lavey_backend). */
  apiBaseUrl: resolveApiBaseUrl(),
  /** Set VITE_USE_MOCK_API=true only for offline UI demos. Production uses the real API. */
  useMockApi: import.meta.env.VITE_USE_MOCK_API === 'true',
  /** Real Supabase auth via lavey_backend (default on). */
  useRealAuth: import.meta.env.VITE_USE_REAL_AUTH !== 'false',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL,
  supabasePublishableKey:
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
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
