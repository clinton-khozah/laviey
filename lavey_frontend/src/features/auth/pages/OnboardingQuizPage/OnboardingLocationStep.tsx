import { useEffect } from 'react';

import { LocationProvinceMap } from '@/components/location/LocationProvinceMap';
import type { UserLocationSnapshot } from '@/types/domain/onboardingQuiz.types';

import type { LocationRequestStatus } from '@/hooks/geolocation/useLiveUserLocation';

import './OnboardingLocationStep.css';

export interface OnboardingLocationStepProps {
  location: UserLocationSnapshot | null;
  status: LocationRequestStatus;
  error: string | null;
  isResolvingPlace: boolean;
  onRequestLocation: () => void;
  onMapReadyChange?: (ready: boolean) => void;
}

function formatCoords(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function OnboardingLocationStep({
  location,
  status,
  error,
  isResolvingPlace,
  onRequestLocation,
  onMapReadyChange,
}: OnboardingLocationStepProps) {
  useEffect(() => {
    if (status === 'idle') {
      onRequestLocation();
    }
  }, [status, onRequestLocation]);

  const hasCoords = Boolean(
    location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude),
  );
  const hasPlace = Boolean(location?.suburb && location?.province && location?.country);
  const mapReady = hasCoords && hasPlace && !isResolvingPlace;
  const isPending = status === 'requesting' || status === 'idle';
  const isWatching = status === 'watching';

  useEffect(() => {
    onMapReadyChange?.(mapReady);
  }, [mapReady, onMapReadyChange]);

  useEffect(() => {
    return () => onMapReadyChange?.(false);
  }, [onMapReadyChange]);

  return (
    <section className="onboarding-location">
      <h1 className="onboarding-quiz__title">Share your location</h1>

      <div className="onboarding-location__panel">
        {isPending && (
          <div className="onboarding-location__map-slot">
            <div className="onboarding-location__map-placeholder" role="status">
              <span className="onboarding-location__map-spinner" aria-hidden />
              <span>Waiting for location permission…</span>
            </div>
          </div>
        )}

        {status === 'denied' && (
          <>
            <p className="onboarding-location__status onboarding-location__status--error" role="alert">
              {error ?? 'Location access was blocked.'}
            </p>
            <button type="button" className="onboarding-location__action" onClick={onRequestLocation}>
              Try again
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="onboarding-location__status onboarding-location__status--error" role="alert">
              {error ?? 'Could not read your location.'}
            </p>
            <button type="button" className="onboarding-location__action" onClick={onRequestLocation}>
              Try again
            </button>
          </>
        )}

        {isWatching && location && hasCoords && (
          <>
            <div className="onboarding-location__map-slot">
              <LocationProvinceMap
                latitude={location.latitude}
                longitude={location.longitude}
                country={location.country || 'South Africa'}
                province={location.province || ''}
                suburb={location.suburb || undefined}
                isLoading={!mapReady}
              />
            </div>

            <dl className="onboarding-location__details">
              <div className="onboarding-location__row">
                <dt>Suburb</dt>
                <dd>{location.suburb || (isResolvingPlace ? 'Updating…' : '—')}</dd>
              </div>
              <div className="onboarding-location__row">
                <dt>Province</dt>
                <dd>{location.province || (isResolvingPlace ? 'Updating…' : '—')}</dd>
              </div>
              <div className="onboarding-location__row">
                <dt>Country</dt>
                <dd>{location.country || (isResolvingPlace ? 'Updating…' : '—')}</dd>
              </div>
              <div className="onboarding-location__row onboarding-location__row--coords">
                <dt>Coordinates</dt>
                <dd>{formatCoords(location.latitude, location.longitude)}</dd>
              </div>
            </dl>

            {isResolvingPlace && (
              <p className="onboarding-location__hint" role="status">
                Pinpointing your area…
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
