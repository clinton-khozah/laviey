import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

let adminClient: SupabaseClient | null = null;
let adminClientKey: string | null = null;

function createAdminClient(): SupabaseClient {
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createClient(env.SUPABASE_URL, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseAdmin(): SupabaseClient {
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  if (env.NODE_ENV === 'development' || adminClientKey !== key) {
    adminClient = createAdminClient();
    adminClientKey = key;
  }

  return adminClient!;
}

export function resetSupabaseAdminClient(): void {
  adminClient = null;
  adminClientKey = null;
}

export function isAdminDataSourceReady(): boolean {
  return Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
}
