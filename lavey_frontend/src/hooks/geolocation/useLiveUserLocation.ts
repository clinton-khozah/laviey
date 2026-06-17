import { useCallback, useEffect, useRef, useState } from 'react';

import { reverseGeocode, type ReverseGeocodeResult } from '@/utils/geolocation/reverseGeocode';

export interface UserLocationSnapshot {
  latitude: number;
  longitude: number;
  country: string;
  province: string;
  city: string;
  suburb: string;
}

export type LocationRequestStatus = 'idle' | 'requesting' | 'watching' | 'denied' | 'error';

interface UseLiveUserLocationResult {
  location: UserLocationSnapshot | null;
  status: LocationRequestStatus;
  error: string | null;
  isResolvingPlace: boolean;
  requestLocation: () => void;
  stopWatching: () => void;
}

function roundCoord(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function useLiveUserLocation(): UseLiveUserLocationResult {
  const watchIdRef = useRef<number | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const geocodeTimerRef = useRef<number | null>(null);
  const lastGeocodedRef = useRef<string | null>(null);

  const [location, setLocation] = useState<UserLocationSnapshot | null>(null);
  const [status, setStatus] = useState<LocationRequestStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (geocodeTimerRef.current !== null) {
      window.clearTimeout(geocodeTimerRef.current);
      geocodeTimerRef.current = null;
    }
    geocodeAbortRef.current?.abort();
    geocodeAbortRef.current = null;
  }, []);

  const resolvePlace = useCallback((latitude: number, longitude: number) => {
    const key = `${roundCoord(latitude)},${roundCoord(longitude)}`;
    if (lastGeocodedRef.current === key) return;

    if (geocodeTimerRef.current !== null) {
      window.clearTimeout(geocodeTimerRef.current);
    }

    geocodeTimerRef.current = window.setTimeout(() => {
      geocodeAbortRef.current?.abort();
      const controller = new AbortController();
      geocodeAbortRef.current = controller;
      setIsResolvingPlace(true);

      void reverseGeocode(latitude, longitude, controller.signal)
        .then((place: ReverseGeocodeResult) => {
          lastGeocodedRef.current = key;
          setLocation((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              latitude: roundCoord(latitude),
              longitude: roundCoord(longitude),
              country: place.country || prev.country,
              province: place.province || prev.province,
              city: place.city || prev.city,
              suburb: place.suburb || prev.suburb,
            };
          });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : 'Could not look up your area.');
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsResolvingPlace(false);
          }
        });
    }, 700);
  }, []);

  const handlePosition = useCallback(
    (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setStatus('watching');
      setError(null);
      setLocation((prev) => ({
        latitude: roundCoord(latitude),
        longitude: roundCoord(longitude),
        country: prev?.country ?? '',
        province: prev?.province ?? '',
        city: prev?.city ?? '',
        suburb: prev?.suburb ?? '',
      }));
      resolvePlace(latitude, longitude);
    },
    [resolvePlace],
  );

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setError('Location is not supported on this device.');
      return;
    }

    stopWatching();
    setStatus('requesting');
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setStatus('denied');
          setError('Location access was blocked. Allow it in your browser settings to continue.');
          return;
        }
        setStatus('error');
        setError('Could not read your location. Try again.');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 20_000,
      },
    );
  }, [handlePosition, stopWatching]);

  useEffect(() => () => stopWatching(), [stopWatching]);

  return {
    location,
    status,
    error,
    isResolvingPlace,
    requestLocation,
    stopWatching,
  };
}
