import { useCallback, useEffect, useState } from 'react';
import { profileService } from '@/services';
import type { Profile } from '@/types';

export function useMessagesDiscoverSuggestions(open: boolean) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await profileService.getMessagesDiscoverSuggestions();
      setProfiles(next);
    } catch (err) {
      setProfiles([]);
      setError(err instanceof Error ? err.message : 'Could not load suggestions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void refetch();
  }, [open, refetch]);

  return { profiles, isLoading, error, refetch };
}
