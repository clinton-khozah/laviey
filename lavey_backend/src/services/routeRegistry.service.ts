import { supabase } from '../lib/supabase.js';
import { STATIC_API_ROUTES, type ApiRouteRecord } from '../data/staticApiRoutes.js';

let cachedRoutes: ApiRouteRecord[] = [...STATIC_API_ROUTES];

function patternToRegex(pathPattern: string): RegExp {
  const escaped = pathPattern
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) return '[^/]+';
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp(`^${escaped}$`);
}

export async function loadRouteRegistry(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('api_routes')
      .select('method, path_pattern, handler_key, description, is_active')
      .eq('is_active', true)
      .order('path_pattern', { ascending: true });

    if (error || !data?.length) {
      console.warn('Using static API route registry:', error?.message ?? 'No rows in api_routes');
      cachedRoutes = [...STATIC_API_ROUTES];
      return;
    }

    cachedRoutes = data as ApiRouteRecord[];
    console.log(`Loaded ${cachedRoutes.length} API routes from database`);
  } catch (error) {
    console.warn('Failed to load api_routes from Supabase; using static registry', error);
    cachedRoutes = [...STATIC_API_ROUTES];
  }
}

export function getRegisteredRoutes(): ApiRouteRecord[] {
  return cachedRoutes;
}

export function findRegisteredRoute(method: string, path: string): ApiRouteRecord | null {
  const normalizedPath = path.split('?')[0] || '/';

  return (
    cachedRoutes.find((route) => {
      if (route.method !== method.toUpperCase()) return false;
      return patternToRegex(route.path_pattern).test(normalizedPath);
    }) ?? null
  );
}

export function findPathWithDifferentMethod(method: string, path: string): ApiRouteRecord | null {
  const normalizedPath = path.split('?')[0] || '/';

  return (
    cachedRoutes.find((route) => {
      if (route.method === method.toUpperCase()) return false;
      return patternToRegex(route.path_pattern).test(normalizedPath);
    }) ?? null
  );
}
