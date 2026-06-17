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
  const needsPermissionPrompt = status === 'idle';
  const isPending = status === 'requesting';
  const isWatching = status === 'watching';

  return (
    <section className="onboarding-location">
      <h1 className="onboarding-quiz__title">Share your location</h1>
      <p className="onboarding-quiz__subtitle">
        We use this to find people near you — your city is shown on your profile, never your exact
        address.
      </p>

      <div className="onboarding-location__panel">
        {needsPermissionPrompt && (
          <div
            className="onboarding-location__prompt"
            role="dialog"
            aria-labelledby="onboarding-location-prompt-title"
          >
            <h2 id="onboarding-location-prompt-title" className="onboarding-location__prompt-title">
              Allow location access
            </h2>
            <p className="onboarding-location__prompt-copy">
              Tap below and your browser will ask to share your location. Choose{' '}
              <strong>Allow</strong> so we can show you nearby matches.
            </p>
            <button
              type="button"
              className="onboarding-location__prompt-btn"
              onClick={onRequestLocation}
            >
              Allow location
            </button>
          </div>
        )}

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
            <p className="onboarding-location__hint">
              Enable location for this site in your browser settings, then try again.
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
                <dt>City</dt>
                <dd>{location.city || (isResolvingPlace ? 'Updating…' : '—')}</dd>
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

            <button type="button" className="onboarding-location__refresh" onClick={onRequestLocation}>
              Refresh location
            </button>
          </>
        )}
      </div>
    </section>
  );
}
