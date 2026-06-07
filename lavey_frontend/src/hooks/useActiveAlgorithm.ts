import { useCallback, useEffect, useState } from 'react';
import {
  getAppliedAlgorithm,
  subscribeAlgorithmChange,
  type AppliedAlgorithmConfig,
} from '@/features/admin/algorithm/algorithmConfig';

export function useActiveAlgorithm() {
  const [applied, setApplied] = useState<AppliedAlgorithmConfig | null>(() => getAppliedAlgorithm());

  useEffect(() => subscribeAlgorithmChange(setApplied), []);

  const refresh = useCallback(() => {
    setApplied(getAppliedAlgorithm());
  }, []);

  return { applied, refresh };
}
