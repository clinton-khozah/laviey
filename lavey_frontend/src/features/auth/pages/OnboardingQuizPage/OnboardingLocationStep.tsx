import { useEffect } from 'react';

import type { UserLocationSnapshot } from '@/types/domain/onboardingQuiz.types';

import type { LocationRequestStatus } from '@/hooks/geolocation/useLiveUserLocation';

import './OnboardingLocationStep.css';

export interface OnboardingLocationStepProps {
  location: UserLocationSnapshot | null;
  status: LocationRequestStatus;
  error: string | null;
  isResolvingPlace: boolean;
  onRequestLocation: () => void;
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
}: OnboardingLocationStepProps) {
  useEffect(() => {
    if (status === 'idle') {
      onRequestLocation();
    }
  }, [status, onRequestLocation]);

  const hasPlace = Boolean(location?.suburb && location?.province && location?.country);
  const isPending = status === 'requesting' || status === 'idle';
  const isWatching = status === 'watching';

  return (
    <section className="onboarding-location">
      <div className="onboarding-quiz__visual" aria-hidden>
        <span className="onboarding-quiz__visual-ring" />
        <span className="onboarding-quiz__visual-emoji">📍</span>
      </div>

      <h1 className="onboarding-quiz__title">Share your location</h1>
      <p className="onboarding-quiz__subtitle">
        We use this to find people near you — suburb level only, never your exact address on your
        profile.
      </p>

      <div className="onboarding-location__panel">
        {isPending && (
          <p className="onboarding-location__status" role="status">
            Waiting for location permission…
          </p>
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

        {isWatching && location && (
          <>
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

            {hasPlace && !isResolvingPlace && (
              <p className="onboarding-location__hint onboarding-location__hint--ok" role="status">
                Location locked in. You can start exploring when ready.
              </p>
            )}

            <button type="button" className="onboarding-location__refresh" onClick={onRequestLocation}>
              Refresh location
            </button>
          </>
        )}
      </div>
    </section>
  );
}
