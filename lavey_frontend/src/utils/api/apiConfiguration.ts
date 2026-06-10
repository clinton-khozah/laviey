import { env } from '@/config/env';

/** Returns a user-facing message when the production build has no real backend URL. */
export function getApiConfigurationError(): string | null {
  const url = env.apiBaseUrl.trim();

  if (!url) {
    return 'Backend API URL is missing. Set VITE_API_BASE_URL on Netlify to your hosted API (e.g. https://your-api.onrender.com/api).';
  }

  if (url.startsWith('/')) {
    return 'Sign-in needs a hosted backend, not /api on this site. Set VITE_API_BASE_URL on Netlify to your API URL, then redeploy.';
  }

  if (!env.isDev && /localhost|127\.0\.0\.1/i.test(url)) {
    return 'API still points to localhost. Update VITE_API_BASE_URL on Netlify to your public backend URL, then redeploy.';
  }

  return null;
}
