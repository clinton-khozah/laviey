import { useCallback, useEffect, useState } from 'react';
import { platinumService } from '@/services/subscription/platinumService';
import type { PlatinumCatalog } from '@/types';

export function usePlatinumCatalog(open: boolean) {
  const [catalog, setCatalog] = useState<PlatinumCatalog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await platinumService.getCatalog();
      setCatalog(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Platinum offers.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  return { catalog, isLoading, error, reload: load };
}
