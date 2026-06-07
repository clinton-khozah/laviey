import type { PostgrestError } from '@supabase/supabase-js';

export function formatSupabaseError(
  error: PostgrestError | null | undefined,
  httpStatus?: number,
): string {
  if (httpStatus === 401) {
    return 'SUPABASE_SERVICE_ROLE_KEY is invalid or revoked. In Supabase go to Project Settings → API and copy the service_role secret key into lavey_backend/.env, then restart the API.';
  }

  if (!error) {
    return httpStatus ? `Database request failed (HTTP ${httpStatus})` : 'Database request failed';
  }

  const parts = [error.message, error.details, error.hint, error.code].filter(
    (part) => typeof part === 'string' && part.trim().length > 0,
  );

  if (error.code === '42P01') {
    return 'Database table missing. Run sql/013_admin_auth.sql in the Supabase SQL editor.';
  }

  return parts.join(' — ') || 'Database request failed';
}
