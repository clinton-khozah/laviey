import { useCallback, useRef } from 'react';

const DOUBLE_TAP_MS = 300;

export function useDoubleTap(onDoubleTap: () => void) {
  const lastTap = useRef(0);

  const onPointerUp = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      onDoubleTap();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }, [onDoubleTap]);

  return { onPointerUp };
}
