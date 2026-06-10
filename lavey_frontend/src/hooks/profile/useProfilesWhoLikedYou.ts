import { useCallback, useEffect, useState } from 'react';
import { profileService } from '@/services/profile/profileService';
import type { Profile } from '@/types';

export function useProfilesWhoLikedYou(enabled = true) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const rows = await profileService.getProfilesWhoLikedYou();
      setProfiles(rows);
    } catch (err) {
      setProfiles([]);
      setError(err instanceof Error ? err.message : 'Could not load likes');
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { profiles, count: profiles.length, isLoading, error, refetch };
}
