import { geoApi } from "../api/services";

/**
 * Country/town lookup for manual location entry during onboarding.
 * Uses countriesnow.space (free, no API key) first so the picker works even
 * when our backend geo routes are unavailable. Falls back to our DB-backed
 * endpoints when present (see lavey-backend sql/068_geo_countries_cities.sql).
 */
const FREE_API_BASE = "https://countriesnow.space/api/v0.1";
const FREE_API_TIMEOUT_MS = 12_000;

let countriesCache: string[] | null = null;
const citiesCache = new Map<string, string[]>();

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FREE_API_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Request failed.");
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCountriesFromFreeApi(): Promise<string[]> {
  const json = await fetchJson<{ data?: Array<{ name: string }> }>(`${FREE_API_BASE}/countries/positions`);
  return (json.data ?? []).map((c) => c.name).sort((a, b) => a.localeCompare(b));
}

async function fetchCitiesFromFreeApi(country: string): Promise<string[]> {
  const json = await fetchJson<{ data?: string[] }>(
    `${FREE_API_BASE}/countries/cities/q?country=${encodeURIComponent(country)}`,
  );
  return [...(json.data ?? [])].sort((a, b) => a.localeCompare(b));
}

export async function fetchCountries(): Promise<string[]> {
  if (countriesCache) return countriesCache;
  try {
    const names = await fetchCountriesFromFreeApi();
    countriesCache = names;
    return names;
  } catch {
    const countries = await geoApi.countries();
    const names = countries.map((c) => c.name).sort((a, b) => a.localeCompare(b));
    countriesCache = names;
    return names;
  }
}

export async function fetchCitiesForCountry(country: string): Promise<string[]> {
  const cached = citiesCache.get(country);
  if (cached) return cached;
  let cities: string[];
  try {
    cities = await fetchCitiesFromFreeApi(country);
  } catch {
    cities = [...(await geoApi.cities(country))].sort((a, b) => a.localeCompare(b));
  }
  citiesCache.set(country, cities);
  return cities;
}
