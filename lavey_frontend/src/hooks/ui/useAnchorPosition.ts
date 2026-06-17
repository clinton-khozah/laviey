import { useLayoutEffect, useState, type RefObject } from 'react';

export const ANCHOR_GAP_PX = 2;

export interface AnchorPosition {
  top: number;
  right: number;
}

export interface AnchorAbovePosition {
  bottom: number;
  right: number;
}

export function measureAnchorBelow(anchor: HTMLElement | null): AnchorPosition | null {
  if (!anchor) return null;
  const rect = anchor.getBoundingClientRect();
  return {
    top: rect.bottom + ANCHOR_GAP_PX,
    right: Math.max(12, window.innerWidth - rect.right),
  };
}

export function measureAnchorAboveRight(anchor: HTMLElement | null): AnchorAbovePosition | null {
  if (!anchor) return null;
  const rect = anchor.getBoundingClientRect();
  return {
    bottom: window.innerHeight - rect.top + ANCHOR_GAP_PX,
    right: Math.max(12, window.innerWidth - rect.right),
  };
}

export function useAnchorPosition(
  active: boolean,
  anchorRef?: RefObject<HTMLElement | null>,
): AnchorPosition | null {
  const [anchorPos, setAnchorPos] = useState<AnchorPosition | null>(null);

  useLayoutEffect(() => {
    if (!active) {
      setAnchorPos(null);
      return;
    }

    const update = () => {
      setAnchorPos(measureAnchorBelow(anchorRef?.current ?? null));
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [active, anchorRef]);

  return anchorPos;
}

export function useAnchorAbovePosition(
  active: boolean,
  anchorRef?: RefObject<HTMLElement | null>,
): AnchorAbovePosition | null {
  const [anchorPos, setAnchorPos] = useState<AnchorAbovePosition | null>(null);

  useLayoutEffect(() => {
    if (!active) {
      setAnchorPos(null);
      return;
    }

    const update = () => {
      setAnchorPos(measureAnchorAboveRight(anchorRef?.current ?? null));
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [active, anchorRef]);

  return anchorPos;
}
