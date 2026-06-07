import { useCallback, useEffect, useState } from 'react';
import { userProfileService } from '@/services';
import type { UserProfile } from '@/types';
import { getUserFacingErrorMessage } from '@/utils/errors/userFacingErrorMessage';

let cachedProfile: UserProfile | null = null;

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);
  const [isLoading, setIsLoading] = useState(!cachedProfile);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!cachedProfile) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const next = await userProfileService.getMyProfile();
      cachedProfile = next;
      setProfile(next);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, 'Failed to load profile'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { profile, isLoading, error, refetch: fetch };
}

export function clearUserProfileCache(): void {
  cachedProfile = null;
}
