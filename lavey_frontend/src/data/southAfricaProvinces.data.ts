import type { Feature, FeatureCollection, Polygon } from 'geojson';

/** Simplified South Africa province outlines for the location preview map. */
export const SOUTH_AFRICA_PROVINCES: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    province('Western Cape', [
      [17.8, -34.8], [19.8, -34.2], [21.2, -34.5], [22.2, -33.4], [21.0, -32.0], [19.0, -31.2], [17.5, -32.2], [17.8, -34.8],
    ]),
    province('Northern Cape', [
      [16.4, -29.8], [22.8, -29.5], [24.8, -28.0], [25.2, -24.5], [20.0, -24.8], [17.8, -26.5], [16.4, -29.8],
    ]),
    province('Eastern Cape', [
      [22.2, -33.4], [25.0, -32.5], [29.8, -31.0], [29.5, -26.0], [25.2, -24.5], [24.8, -28.0], [22.8, -29.5], [22.2, -33.4],
    ]),
    province('Free State', [
      [24.8, -30.8], [29.5, -30.2], [29.5, -26.0], [25.2, -24.5], [24.8, -28.0], [24.8, -30.8],
    ]),
    province('KwaZulu-Natal', [
      [29.0, -31.2], [32.8, -28.8], [32.9, -26.8], [29.5, -26.0], [29.0, -31.2],
    ]),
    province('North West', [
      [22.5, -28.0], [27.8, -27.5], [27.5, -24.5], [25.2, -24.5], [22.5, -28.0],
    ]),
    province('Gauteng', [
      [27.3, -26.5], [28.6, -26.5], [28.6, -25.2], [27.3, -25.2], [27.3, -26.5],
    ]),
    province('Mpumalanga', [
      [28.6, -26.8], [31.8, -26.2], [31.5, -24.5], [27.5, -24.5], [27.8, -27.5], [28.6, -26.8],
    ]),
    province('Limpopo', [
      [27.0, -25.2], [31.5, -24.5], [31.8, -22.0], [27.5, -22.0], [27.0, -25.2],
    ]),
  ],
};

function province(name: string, ring: [number, number][]): Feature<Polygon> {
  return {
    type: 'Feature',
    properties: { name },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

const PROVINCE_ALIASES: Record<string, string> = {
  gauteng: 'Gauteng',
  'kwazulu-natal': 'KwaZulu-Natal',
  'kwazulu natal': 'KwaZulu-Natal',
  kzn: 'KwaZulu-Natal',
  'western cape': 'Western Cape',
  'eastern cape': 'Eastern Cape',
  'northern cape': 'Northern Cape',
  'north west': 'North West',
  'north-west': 'North West',
  'free state': 'Free State',
  limpopo: 'Limpopo',
  mpumalanga: 'Mpumalanga',
};

export function normalizeSouthAfricaProvince(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const alias = PROVINCE_ALIASES[trimmed.toLowerCase()];
  return alias ?? trimmed;
}

export function isSouthAfricaCountry(country: string): boolean {
  const normalized = country.trim().toLowerCase();
  return normalized === 'south africa' || normalized === 'za' || normalized === 'rsa';
}
