/**
 * Centralized environment configuration.
 * All `import.meta.env` access should go through this module.
 */
export const env = {
  /** Must be a full URL in production (Netlify cannot run lavey_backend). */
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
    (import.meta.env.DEV ? 'http://localhost:5000/api' : ''),
  /** Mock data for features without backend routes yet (profiles, messages, etc.). */
  useMockApi: import.meta.env.VITE_USE_MOCK_API !== 'false',
  /** Real Supabase auth via lavey_backend even when useMockApi is true. */
  useRealAuth: import.meta.env.VITE_USE_REAL_AUTH === 'true',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
  isDev: import.meta.env.DEV,
} as const;

export function usesBackendAuth(): boolean {
  return env.useRealAuth || !env.useMockApi;
}

/** Online meetups require auth and use Supabase-backed routes in lavey_backend. */
export function usesBackendMeetups(): boolean {
  return usesBackendAuth();
}

export function hasSupabaseRealtime(): boolean {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}
