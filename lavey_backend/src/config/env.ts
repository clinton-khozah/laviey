import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

config({
  path: path.join(backendRoot, '.env'),
  // Prefer lavey_backend/.env over stale Windows user/system env vars.
  override: true,
});

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PREFIX: z.string().default('/api'),
  FRONTEND_URL: z.string().url(),
  CORS_ORIGIN: z.string(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .transform((value) => value.trim())
    .optional(),
  ADMIN_API_SECRET: z.string().min(8).default('lavey-admin-dev-secret'),
  ADMIN_JWT_SECRET: z.string().min(32).default('lavey-admin-jwt-dev-secret-change-in-prod'),
  ADMIN_REGISTER_SECRET: z.string().min(8).default('lavey-admin-register-dev'),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
