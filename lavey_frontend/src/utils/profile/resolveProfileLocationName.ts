/** Suburb / city label shown on discover cards (e.g. Pretoria, Nkomazi). */
export function resolveProfileLocationName(raw: {
  locationName?: string | null;
  location_name?: string | null;
  city?: string | null;
  suburb?: string | null;
  province?: string | null;
}): string | undefined {
  const explicit = (raw.locationName ?? raw.location_name)?.trim();
  if (explicit) return explicit;

  const city = raw.city?.trim();
  if (city) return city;

  const suburb = raw.suburb?.trim();
  if (suburb) return suburb;

  const province = raw.province?.trim();
  if (province) return province;

  return undefined;
}
