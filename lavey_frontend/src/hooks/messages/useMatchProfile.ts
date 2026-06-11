import { useEffect, useState } from 'react';
import { profileService } from '@/services';
import type { Profile } from '@/types';
import { isProfileVerified } from '@/utils/profile/verificationStorage';

export type ProfileLookup =
  | { type: 'user'; id: string }
  | { type: 'meetup-host'; meetupId: string };

function normalizeLookup(lookup: ProfileLookup | string | null): ProfileLookup | null {
  if (!lookup) return null;
  if (typeof lookup === 'string') return { type: 'user', id: lookup };
  return lookup;
}

function lookupKey(lookup: ProfileLookup | string | null): string {
  if (!lookup) return '';
  if (typeof lookup === 'string') return `user:${lookup}`;
  return lookup.type === 'user' ? `user:${lookup.id}` : `meetup:${lookup.meetupId}`;
}

export function useMatchProfile(lookup: ProfileLookup | string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = lookupKey(lookup);

  useEffect(() => {
    const target = normalizeLookup(lookup);
    if (!target) {
      setProfile(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const activeTarget = target;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data =
          activeTarget.type === 'meetup-host'
            ? await profileService.getMeetupHostProfile(activeTarget.meetupId)
            : await profileService.getProfileById(activeTarget.id);
        if (!cancelled) {
          setProfile({
            ...data,
            verified: data.verified || isProfileVerified(data.id),
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load profile');
          setProfile(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [key, lookup]);

  return { profile, isLoading, error };
}
