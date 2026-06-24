import { useCallback, useEffect, useState } from 'react';
import {
  fetchAppliedAlgorithm,
  getAppliedAlgorithm,
  subscribeAlgorithmChange,
  type AppliedAlgorithmConfig,
} from '@/features/admin/algorithm/algorithmConfig';

export function useActiveAlgorithm() {
  const [applied, setApplied] = useState<AppliedAlgorithmConfig | null>(() => getAppliedAlgorithm());

  useEffect(() => subscribeAlgorithmChange(setApplied), []);

  useEffect(() => {
    void fetchAppliedAlgorithm().then(setApplied);
  }, []);

  const refresh = useCallback(() => {
    void fetchAppliedAlgorithm().then(setApplied);
  }, []);

  return { applied, refresh };
}
