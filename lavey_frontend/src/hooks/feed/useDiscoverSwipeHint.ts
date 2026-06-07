import { useCallback, useState } from 'react';
import { hasSeenDiscoverSwipeHint, markDiscoverSwipeHintSeen } from '@/utils/discoverSwipeHint';

export function useDiscoverSwipeHint() {
  const [showSwipeHint, setShowSwipeHint] = useState(() => !hasSeenDiscoverSwipeHint());

  const dismissSwipeHint = useCallback(() => {
    markDiscoverSwipeHintSeen();
    setShowSwipeHint(false);
  }, []);

  return { showSwipeHint, dismissSwipeHint };
}
