import * as Location from "expo-location";
import { profileApi } from "../api/services";

export type UserLocationPayload = {
  latitude: number;
  longitude: number;
  country?: string;
  province?: string;
  city?: string;
  suburb?: string;
};

async function resolvePlaceFromCoords(
  latitude: number,
  longitude: number,
): Promise<Pick<UserLocationPayload, "country" | "province" | "city" | "suburb">> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!place) return {};
    return {
      country: place.country?.trim() || undefined,
      province: (place.region || place.city)?.trim() || undefined,
      city: (place.city || place.subregion)?.trim() || undefined,
      suburb: (place.district || place.subregion)?.trim() || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Reads the device location and PATCHes /users/me/location with coordinates
 * plus resolved country/city when geocoding succeeds.
 */
export async function syncUserLocation(options?: {
  requestPermission?: boolean;
}): Promise<boolean> {
  const permission = await Location.getForegroundPermissionsAsync();
  let granted = permission.granted;

  if (!granted && options?.requestPermission) {
    const requested = await Location.requestForegroundPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) return false;

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const { latitude, longitude } = position.coords;
  const place = await resolvePlaceFromCoords(latitude, longitude);

  await profileApi.location({
    latitude,
    longitude,
    ...place,
  });
  return true;
}
