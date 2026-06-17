import { useCallback, useEffect, useState } from 'react';
import { profileService } from '@/services';
import type { DiscoverFilters, Profile } from '@/types';

export function useMessagesFindSuggestions(open: boolean, baseFilters: DiscoverFilters) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await profileService.getMessagesFindSuggestions(baseFilters);
      setProfiles(next);
    } catch (err) {
      setProfiles([]);
      setError(err instanceof Error ? err.message : 'Could not load people');
    } finally {
      setIsLoading(false);
    }
  }, [baseFilters]);

  useEffect(() => {
    if (!open) return;
    void refetch();
  }, [open, refetch]);

  return { profiles, isLoading, error, refetch };
}
