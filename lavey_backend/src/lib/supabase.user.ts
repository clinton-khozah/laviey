import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/** Supabase client scoped to the signed-in user's JWT (respects RLS). */
export function createSupabaseUserClient(accessToken: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
