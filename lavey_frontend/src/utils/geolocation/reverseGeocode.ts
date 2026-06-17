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
  suburb?: string;
  neighbourhood?: string;
  city_district?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodeResult> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '14');

  const response = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
    },
  });

  if (!response.ok) {
    throw new Error('Could not resolve your area from coordinates.');
  }

  const data = (await response.json()) as NominatimResponse;
  const address = data.address ?? {};

  const city =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    '';

  const suburb =
    address.suburb ??
    address.neighbourhood ??
    address.city_district ??
    '';

  const province = address.state ?? address.province ?? address.region ?? '';
  const country = address.country ?? '';

  return {
    country: country.trim(),
    province: province.trim(),
    city: city.trim(),
    suburb: suburb.trim(),
  };
}
