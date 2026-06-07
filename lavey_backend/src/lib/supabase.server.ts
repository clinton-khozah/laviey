import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';

export function createSupabaseServerClient(req: Request, res: Response) {
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(req.headers.cookie ?? '').map(({ name, value }) => ({
          name,
          value: value ?? '',
        }));
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        if (res.headersSent) return;
        cookiesToSet.forEach(({ name, value, options }) => {
          res.appendHeader('Set-Cookie', serializeCookieHeader(name, value, options));
        });
      },
    },
  });
}
