import { useEffect, useRef } from 'react';
import { AppOverlay } from '@/components/ui/AppOverlay';
import './MatchProfilePhotoViewer.css';

interface MatchProfilePhotoViewerProps {
  photos: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

const SWIPE_THRESHOLD_PX = 40;

export function MatchProfilePhotoViewer({
  photos,
  index,
  onClose,
  onIndexChange,
}: MatchProfilePhotoViewerProps) {
  const hasMultiple = photos.length > 1;
  const startXRef = useRef<number | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (!hasMultiple) return;
      if (event.key === 'ArrowLeft') {
        onIndexChange((index - 1 + photos.length) % photos.length);
      }
      if (event.key === 'ArrowRight') {
        onIndexChange((index + 1) % photos.length);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasMultiple, index, onClose, onIndexChange, photos.length]);

  const go = (direction: -1 | 1) => {
    onIndexChange((index + direction + photos.length) % photos.length);
  };

  const handleStart = (clientX: number) => {
    startXRef.current = clientX;
  };

  const handleEnd = (clientX: number) => {
    if (startXRef.current === null || !hasMultiple) return;
    const delta = clientX - startXRef.current;
    startXRef.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    go(delta < 0 ? 1 : -1);
  };

  const src = photos[index];
  if (!src) return null;

  return (
    <AppOverlay>
      <div className="match-profile-photo-viewer" role="dialog" aria-modal="true" aria-label="Profile photo">
        <div className="match-profile-photo-viewer__top">
          {hasMultiple ? (
            <div className="match-profile-photo-viewer__dots" aria-hidden>
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={`match-profile-photo-viewer__dot ${i === index ? 'match-profile-photo-viewer__dot--active' : ''}`}
                />
              ))}
            </div>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="match-profile-photo-viewer__close"
            onClick={onClose}
            aria-label="Close photo"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          className="match-profile-photo-viewer__stage"
          onTouchStart={(event) => handleStart(event.touches[0]?.clientX ?? 0)}
          onTouchEnd={(event) => handleEnd(event.changedTouches[0]?.clientX ?? 0)}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch') return;
            handleStart(event.clientX);
          }}
          onPointerUp={(event) => {
            if (event.pointerType === 'touch') return;
            handleEnd(event.clientX);
          }}
        >
          {hasMultiple ? (
            <>
              <button
                type="button"
                className="match-profile-photo-viewer__tap match-profile-photo-viewer__tap--prev"
                onClick={() => go(-1)}
                aria-label="Previous photo"
              />
              <button
                type="button"
                className="match-profile-photo-viewer__tap match-profile-photo-viewer__tap--next"
                onClick={() => go(1)}
                aria-label="Next photo"
              />
            </>
          ) : null}
          <img src={src} alt="" className="match-profile-photo-viewer__img" draggable={false} />
        </div>
      </div>
    </AppOverlay>
  );
}
