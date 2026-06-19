export interface ReverseGeocodeResult {
  country: string;
  province: string;
  city: string;
  suburb: string;
}

interface NominatimAddress {
  country?: string;
  state?: string;
  province?: string;
  region?: string;
  municipality?: string;
  county?: string;
  city?: string;
  town?: string;
  village?: string;
  locality?: string;
  hamlet?: string;
  suburb?: string;
  neighbourhood?: string;
  city_district?: string;
  residential?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'en',
  'User-Agent': 'Lavey Dating App',
};

async function fetchNominatim(
  latitude: number,
  longitude: number,
  zoom: number,
  signal?: AbortSignal,
): Promise<NominatimResponse> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', String(zoom));

  const response = await fetch(url.toString(), {
    signal,
    headers: NOMINATIM_HEADERS,
  });

  if (!response.ok) {
    throw new Error('Could not resolve your area from coordinates.');
  }

  return (await response.json()) as NominatimResponse;
}

function isWardLabel(value: string): boolean {
  return /\bward\s+\d+\b/i.test(value);
}

function extractCityFromDisplayName(displayName: string): string {
  const first = displayName.split(',')[0]?.trim() ?? '';
  if (!first || isWardLabel(first)) return '';
  return first;
}

function extractCityFromCounty(county: string): string {
  const trimmed = county.trim();
  if (!trimmed) return '';

  const cityOfMetro = trimmed.match(/^City of (.+?) Metropolitan Municipality$/i);
  if (cityOfMetro?.[1]) return cityOfMetro[1].trim();

  const metro = trimmed.match(/^(.+?) Metropolitan Municipality$/i);
  if (metro?.[1]) return metro[1].trim();

  return '';
}

function pickCity(address: NominatimAddress, displayName?: string): string {
  const direct =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.locality ??
    address.hamlet ??
    '';

  if (direct.trim()) return direct.trim();

  const fromCounty = extractCityFromCounty(address.county ?? '');
  if (fromCounty) return fromCounty;

  if (displayName) {
    const fromDisplay = extractCityFromDisplayName(displayName);
    if (fromDisplay) return fromDisplay;
  }

  return '';
}

function pickSuburb(address: NominatimAddress): string {
  const candidates = [
    address.suburb,
    address.neighbourhood,
    address.city_district,
    address.residential,
    address.locality,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim() ?? '';
    if (!value || isWardLabel(value)) continue;
    return value;
  }

  return '';
}

function pickProvince(address: NominatimAddress): string {
  return (address.state ?? address.province ?? address.region ?? '').trim();
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodeResult> {
  // City-level and street-level results use different zooms in Nominatim.
  // e.g. Gauteng coords often return ward/suburb at z14 with no `city` field.
  const [cityLevel, localLevel] = await Promise.all([
    fetchNominatim(latitude, longitude, 11, signal),
    fetchNominatim(latitude, longitude, 16, signal),
  ]);

  const cityAddress = cityLevel.address ?? {};
  const localAddress = localLevel.address ?? {};

  const city =
    pickCity(cityAddress, cityLevel.display_name) ||
    pickCity(localAddress, localLevel.display_name);

  const suburb = pickSuburb(localAddress) || pickSuburb(cityAddress);
  const province = pickProvince(cityAddress) || pickProvince(localAddress);
  const country = (cityAddress.country ?? localAddress.country ?? '').trim();

  return {
    country,
    province,
    city,
    suburb,
  };
}
