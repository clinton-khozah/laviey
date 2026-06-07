import { useCallback, useEffect, useState } from 'react';

function isScreenshotShortcut(event: KeyboardEvent): boolean {
  if (event.key === 'PrintScreen') return true;

  if (event.metaKey && event.shiftKey && ['3', '4', '5'].includes(event.key)) {
    return true;
  }

  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 's') {
    return true;
  }

  return false;
}

export function usePrivacyProtection() {
  const [contentShielded, setContentShielded] = useState(false);
  const [warnVisible, setWarnVisible] = useState(false);

  const showCaptureWarning = useCallback(() => {
    setWarnVisible(true);
    window.setTimeout(() => setWarnVisible(false), 2200);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('privacy-protected');

    const onVisibility = () => {
      setContentShielded(document.hidden);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isScreenshotShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
      showCaptureWarning();
    };

    const onContextMenu = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof HTMLImageElement || target instanceof HTMLVideoElement) {
        event.preventDefault();
      }
    };

    const onDragStart = (event: DragEvent) => {
      if (event.target instanceof HTMLImageElement || event.target instanceof HTMLVideoElement) {
        event.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('dragstart', onDragStart);

    return () => {
      document.documentElement.classList.remove('privacy-protected');
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('dragstart', onDragStart);
    };
  }, [showCaptureWarning]);

  return { contentShielded, warnVisible };
}
