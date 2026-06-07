import { env } from '../config/env.js';
import { getSupabaseAdmin, isAdminDataSourceReady } from './supabase.admin.js';

export async function verifyAdminSupabaseOnStartup(): Promise<void> {
  if (!isAdminDataSourceReady()) {
    console.warn(
      '[admin] SUPABASE_SERVICE_ROLE_KEY is not set — admin register/login and /admin/users will fail.',
    );
    return;
  }

  const { error, status } = await getSupabaseAdmin()
    .from('admin_accounts')
    .select('*', { count: 'exact', head: true });

  if (error || (status != null && status >= 400)) {
    console.error(
      `[admin] Supabase service key check failed (HTTP ${status ?? 'unknown'}). ` +
        'Update SUPABASE_SERVICE_ROLE_KEY in lavey_backend/.env and restart npm run dev.',
    );
    if (error?.message) console.error(`[admin] ${error.message}`);
    return;
  }

  console.log('[admin] Supabase service key OK (admin_accounts reachable).');
}
