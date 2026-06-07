import { useEffect, useState } from 'react';
import { flameQuotaService } from '@/services';
import type { FlameQuota } from '@/types';

interface UseFlameQuotaResult {
  quota: FlameQuota | null;
  isLoading: boolean;
}

export function useFlameQuota(): UseFlameQuotaResult {
  const [quota, setQuota] = useState<FlameQuota | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await flameQuotaService.getQuota();
        if (!cancelled) setQuota(data);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { quota, isLoading };
}
