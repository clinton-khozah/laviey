/**
 * Centralized environment configuration.
 * All `import.meta.env` access should go through this module.
 */
export const env = {
  /** Must be a full URL in production (Netlify cannot run lavey_backend). */
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
    (import.meta.env.DEV ? 'http://localhost:5000/api' : ''),
  /** Set VITE_USE_MOCK_API=true only for offline UI demos. Production uses the real API. */
  useMockApi: import.meta.env.VITE_USE_MOCK_API === 'true',
  /** Real Supabase auth via lavey_backend (default on). */
  useRealAuth: import.meta.env.VITE_USE_REAL_AUTH !== 'false',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
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
