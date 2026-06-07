import { createApp } from './app.js';
import { env } from './config/env.js';
import { verifyAdminSupabaseOnStartup } from './lib/verifyAdminSupabase.js';
import { loadRouteRegistry } from './services/routeRegistry.service.js';

async function start(): Promise<void> {
  await loadRouteRegistry();
  await verifyAdminSupabaseOnStartup();

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`Lavey API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(`Swagger UI: http://localhost:${env.PORT}${env.API_PREFIX}/docs`);
    console.log(`Route registry: ${env.API_PREFIX}/meta/routes`);
    console.log('');
    console.log('Google OAuth setup checklist:');
    console.log('  1. Google Cloud → OAuth client → Authorized redirect URIs:');
    console.log('     https://wgyqotbvjnkafmwmhvbj.supabase.co/auth/v1/callback');
    console.log('  2. Supabase → Auth → URL Configuration → Redirect URLs:');
    console.log(`     ${env.GOOGLE_REDIRECT_URI}`);
    console.log('  3. Supabase → Auth → Providers → Google: enable + paste Client ID & Secret');
    console.log('');
    console.log('Run sql/001_api_routes.sql in Supabase to seed api_routes table.');
  });
}

void start();
