import { useCallback, useEffect, useState } from 'react';
import { FALLBACK_PLATINUM_CATALOG } from '@/constants/platinum';
import { platinumService } from '@/services/subscription/platinumService';
import type { PlatinumCatalog } from '@/types';
import {
  getUserFacingErrorMessage,
  isSignInRequiredError,
  isSignInRequiredMessage,
} from '@/utils/errors/userFacingErrorMessage';

export function usePlatinumCatalog(open: boolean, country?: string | null) {
  const [catalog, setCatalog] = useState<PlatinumCatalog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await platinumService.getCatalog({
        country: country?.trim() || undefined,
      });
      setCatalog({
        ...data,
        features:
          data.features.length > 0 ? data.features : FALLBACK_PLATINUM_CATALOG.features,
      });
    } catch (err) {
      const message = getUserFacingErrorMessage(err, 'Could not load Platinum offers.');
      setError(message);
      setCatalog(
        isSignInRequiredError(err) || isSignInRequiredMessage(message)
          ? null
          : FALLBACK_PLATINUM_CATALOG,
      );
    } finally {
      setIsLoading(false);
    }
  }, [country]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  return { catalog, isLoading, error, reload: load };
}
