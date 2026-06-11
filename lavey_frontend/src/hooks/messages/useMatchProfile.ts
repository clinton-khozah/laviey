import { useEffect, useState } from 'react';
import { profileService } from '@/services';
import type { Profile } from '@/types';
import { isProfileVerified } from '@/utils/profile/verificationStorage';

export function useMatchProfile(profileId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) {
      setProfile(null);
      setError(null);
      return;
    }

    const id = profileId;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await profileService.getProfileById(id);
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
  }, [profileId]);

  return { profile, isLoading, error };
}
