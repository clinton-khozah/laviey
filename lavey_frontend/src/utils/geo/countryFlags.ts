/** Normalize country names for lookup and comparison. */
export function normalizeCountryKey(country: string): string {
  return country.trim().toLowerCase().replace(/\s+/g, ' ');
}

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  afghanistan: 'AF',
  albania: 'AL',
  algeria: 'DZ',
  argentina: 'AR',
  australia: 'AU',
  austria: 'AT',
  bangladesh: 'BD',
  belgium: 'BE',
  brazil: 'BR',
  canada: 'CA',
  chile: 'CL',
  china: 'CN',
  colombia: 'CO',
  'czech republic': 'CZ',
  czechia: 'CZ',
  denmark: 'DK',
  egypt: 'EG',
  ethiopia: 'ET',
  finland: 'FI',
  france: 'FR',
  germany: 'DE',
  ghana: 'GH',
  greece: 'GR',
  hungary: 'HU',
  india: 'IN',
  indonesia: 'ID',
  ireland: 'IE',
  israel: 'IL',
  italy: 'IT',
  japan: 'JP',
  kenya: 'KE',
  mexico: 'MX',
  morocco: 'MA',
  netherlands: 'NL',
  'new zealand': 'NZ',
  nigeria: 'NG',
  norway: 'NO',
  pakistan: 'PK',
  peru: 'PE',
  philippines: 'PH',
  poland: 'PL',
  portugal: 'PT',
  romania: 'RO',
  russia: 'RU',
  'russian federation': 'RU',
  'saudi arabia': 'SA',
  singapore: 'SG',
  'south africa': 'ZA',
  'south korea': 'KR',
  korea: 'KR',
  spain: 'ES',
  sweden: 'SE',
  switzerland: 'CH',
  tanzania: 'TZ',
  thailand: 'TH',
  turkey: 'TR',
  turkiye: 'TR',
  uganda: 'UG',
  ukraine: 'UA',
  'united arab emirates': 'AE',
  uae: 'AE',
  'united kingdom': 'GB',
  uk: 'GB',
  'great britain': 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  vietnam: 'VN',
  zimbabwe: 'ZW',
};

export function resolveCountryIso(country: string): string | null {
  const key = normalizeCountryKey(country);
  if (!key) return null;
  return COUNTRY_NAME_TO_ISO[key] ?? null;
}

export function countryFlagEmoji(country: string): string {
  const iso = resolveCountryIso(country);
  if (!iso || iso.length !== 2) return '🌍';
  const code = iso.toUpperCase();
  return String.fromCodePoint(
    ...[...code].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0)),
  );
}

export function countriesMatch(a: string, b: string): boolean {
  return normalizeCountryKey(a) === normalizeCountryKey(b);
}

export function sortCountryNames(countries: string[]): string[] {
  return [...countries].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}
