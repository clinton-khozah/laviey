import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

const SELF_WIDTH = 108;
const SELF_HEIGHT = 168;
const EDGE = 12;
const TOP_CLEARANCE = 56;

interface FloatPosition {
  x: number;
  y: number;
}

interface MeetingSelfVideoProps {
  boundsRef: RefObject<HTMLElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  displayName: string;
  isVideoEnabled: boolean;
  mediaLoading: boolean;
  mediaError: string | null;
  youLabel: string;
}

function clampPosition(x: number, y: number, width: number, height: number): FloatPosition {
  const maxX = Math.max(EDGE, width - SELF_WIDTH - EDGE);
  const maxY = Math.max(EDGE, height - SELF_HEIGHT - EDGE);
  return {
    x: Math.min(maxX, Math.max(EDGE, x)),
    y: Math.min(maxY, Math.max(EDGE, y)),
  };
}

function defaultPosition(width: number, height: number): FloatPosition {
  return clampPosition(width - SELF_WIDTH - EDGE, TOP_CLEARANCE, width, height);
}

export function MeetingSelfVideo({
  boundsRef,
  videoRef,
  displayName,
  isVideoEnabled,
  mediaLoading,
  mediaError,
  youLabel,
}: MeetingSelfVideoProps) {
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const [pos, setPos] = useState<FloatPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const placeDefault = useCallback(() => {
    const bounds = boundsRef.current;
    if (!bounds) return;
    const { width, height } = bounds.getBoundingClientRect();
    setPos(defaultPosition(width, height));
  }, [boundsRef]);

  useEffect(() => {
    placeDefault();
    const bounds = boundsRef.current;
    if (!bounds) return undefined;

    const observer = new ResizeObserver(() => {
      setPos((current) => {
        const { width, height } = bounds.getBoundingClientRect();
        if (!current) return defaultPosition(width, height);
        return clampPosition(current.x, current.y, width, height);
      });
    });

    observer.observe(bounds);
    return () => observer.disconnect();
  }, [boundsRef, placeDefault]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pos) return;
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pos.x,
      originY: pos.y,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    const bounds = boundsRef.current;
    if (!bounds) return;

    const { width, height } = bounds.getBoundingClientRect();
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setPos(clampPosition(drag.originX + dx, drag.originY + dy, width, height));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;

    drag.active = false;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!pos) return null;

  return (
    <div
      className={`video-meeting__self ${isDragging ? 'video-meeting__self--dragging' : ''}`}
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="img"
      aria-label={`Your camera preview. Drag to reposition.`}
    >
      <div className="video-meeting__self-frame">
        {mediaLoading && (
          <div className="video-meeting__self-loading">
            <span className="video-meeting__spinner" aria-hidden />
          </div>
        )}
        {mediaError && !mediaLoading && (
          <div className="video-meeting__self-error">
            <p>{mediaError}</p>
          </div>
        )}
        {!mediaError && (
          <video
            ref={videoRef}
            className={`video-meeting__self-video ${!isVideoEnabled ? 'video-meeting__self-video--off' : ''}`}
            autoPlay
            playsInline
            muted
          />
        )}
        {!isVideoEnabled && !mediaLoading && !mediaError && (
          <div className="video-meeting__self-off">
            <span>{displayName.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>
      <span className="video-meeting__self-label">{youLabel}</span>
    </div>
  );
}
