import { useCallback, useEffect, useRef, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { LogoLoader } from '@/components/ui/LogoLoader';
import {
  DEFAULT_CROP_TRANSFORM,
  getCropPreviewLayout,
  type PhotoCropTransform,
} from './postTemplateCrop';
import {
  DEFAULT_POST_TEMPLATE_ID,
  fileWithTemplate,
  getPostTemplate,
  POST_TEMPLATES,
  templateStickerGradient,
} from './postTemplates';
import './PostPhotoTemplatePicker.css';

interface PostPhotoTemplatePickerProps {
  open: boolean;
  photoFile: File | null;
  photoUrl: string | null;
  onClose: () => void;
  onApply: (file: File) => void;
}

function TemplateIcon({ id }: { id: string }) {
  if (id === 'none') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10.5" r="1.5" />
        <path d="M21 16l-5.5-5.5a1.5 1.5 0 00-2.12 0L3 18" />
      </svg>
    );
  }
  if (id === 'single') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 3l1.4 4.3H18l-3.6 2.6 1.4 4.3L12 11.6 8.2 14.2l1.4-4.3L6 7.3h4.6L12 3z" />
      </svg>
    );
  }
  if (id === 'open-relationship') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 21s-6-4.35-8-7.5C2.5 11.2 4.5 8 8 8c2 0 3.2 1.2 4 2.5C13.8 9.2 15 8 17 8c3.5 0 5.5 3.2 4 5.5-2 3.15-8 7.5-8 7.5z" />
      </svg>
    );
  }
  if (id === 'serious-relationship') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="14" r="5" />
        <path d="M12 9V5M10 5h4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export function PostPhotoTemplatePicker({
  open,
  photoFile,
  photoUrl,
  onClose,
  onApply,
}: PostPhotoTemplatePickerProps) {
  const [activeTemplateId, setActiveTemplateId] = useState(DEFAULT_POST_TEMPLATE_ID);
  const [transformsByTemplate, setTransformsByTemplate] = useState<Record<string, PhotoCropTransform>>({});
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [frameSize, setFrameSize] = useState({ width: 280, height: 280 });
  const [isApplying, setIsApplying] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const pinchRef = useRef<{ startDistance: number; startScale: number } | null>(null);

  const activeTemplate = getPostTemplate(activeTemplateId);
  const usesFrameOverlay = Boolean(activeTemplate.overlayImage);
  const transform = transformsByTemplate[activeTemplateId] ?? DEFAULT_CROP_TRANSFORM;

  const setTransform = useCallback(
    (updater: PhotoCropTransform | ((prev: PhotoCropTransform) => PhotoCropTransform)) => {
      setTransformsByTemplate((prev) => {
        const current = prev[activeTemplateId] ?? DEFAULT_CROP_TRANSFORM;
        const next = typeof updater === 'function' ? updater(current) : updater;
        return { ...prev, [activeTemplateId]: next };
      });
    },
    [activeTemplateId],
  );

  const resetTransform = useCallback(() => {
    setTransformsByTemplate((prev) => ({ ...prev, [activeTemplateId]: DEFAULT_CROP_TRANSFORM }));
  }, [activeTemplateId]);

  useEffect(() => {
    if (!open) return;
    setActiveTemplateId(DEFAULT_POST_TEMPLATE_ID);
    setTransformsByTemplate({});
    setImageSize({ width: 0, height: 0 });
    setOptionsOpen(false);
  }, [open, photoUrl]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || !open) return;

    const measure = () => {
      setFrameSize({ width: el.clientWidth, height: el.clientHeight });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, activeTemplateId]);

  const imageLayout =
    imageSize.width > 0
      ? getCropPreviewLayout(
          imageSize.width,
          imageSize.height,
          frameSize.width,
          frameSize.height,
          transform,
        )
      : null;

  const updateScale = useCallback((nextScale: number) => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(2.8, Math.max(1, nextScale)),
    }));
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isApplying) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: transform.offsetX,
      baseY: transform.offsetY,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setTransform((prev) => ({
      ...prev,
      offsetX: dragRef.current!.baseX + (e.clientX - dragRef.current!.startX),
      offsetY: dragRef.current!.baseY + (e.clientY - dragRef.current!.startY),
    }));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { startDistance: distance, startScale: transform.scale };
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const ratio = distance / pinchRef.current.startDistance;
    updateScale(pinchRef.current.startScale * ratio);
  };

  const onTouchEnd = () => {
    pinchRef.current = null;
  };

  const handleUsePhoto = async () => {
    if (!photoFile || !frameRef.current) return;
    setIsApplying(true);
    try {
      const file = await fileWithTemplate(photoFile, activeTemplateId, transform, {
        width: frameRef.current.clientWidth,
        height: frameRef.current.clientHeight,
      });
      onApply(file);
    } finally {
      setIsApplying(false);
    }
  };

  if (!open || !photoFile || !photoUrl) return null;

  const optionsMenuButton = (
    <button
      type="button"
      className={`post-template-picker__menu-btn ${optionsOpen ? 'post-template-picker__menu-btn--active' : ''}`}
      onClick={() => setOptionsOpen((prev) => !prev)}
      aria-label={optionsOpen ? 'Hide photo options' : 'Photo options'}
      aria-expanded={optionsOpen}
      aria-controls="post-template-picker-options"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="12" cy="5" r="1.75" />
        <circle cx="12" cy="12" r="1.75" />
        <circle cx="12" cy="19" r="1.75" />
      </svg>
    </button>
  );

  return (
    <ProfileSheet
      open={open}
      title="Your photo"
      onClose={onClose}
      fromTop
      hideHandle
      compact
      headerAction={optionsMenuButton}
    >
      <div className="post-template-picker">
        <div className="post-template-picker__stage">
          <div
            ref={frameRef}
            className="post-template-picker__frame"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
          <img
            src={photoUrl}
            alt="Adjust your photo"
            className="post-template-picker__photo"
            draggable={false}
            style={
              imageLayout
                ? {
                    width: `${imageLayout.width}px`,
                    height: `${imageLayout.height}px`,
                    left: `${imageLayout.left}px`,
                    top: `${imageLayout.top}px`,
                  }
                : undefined
            }
            onLoad={(e) => {
              const img = e.currentTarget;
              setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
            }}
          />
          {usesFrameOverlay && activeTemplate.overlayImage ? (
            <img
              src={activeTemplate.overlayImage}
              alt=""
              className="post-template-picker__overlay"
              draggable={false}
            />
          ) : activeTemplate.text ? (
            <div
              className="post-template-picker__sticker"
              style={{
                background: templateStickerGradient(activeTemplate),
                color: activeTemplate.textColor,
              }}
            >
              {activeTemplate.text}
            </div>
          ) : null}
          {isApplying ? (
            <span className="post-template-picker__frame-loader" aria-live="polite">
              <LogoLoader size="lg" label="Saving photo" />
            </span>
          ) : null}
          </div>
        </div>

        {optionsOpen ? (
          <div id="post-template-picker-options" className="post-template-picker__options">
            <div className="post-template-picker__controls">
              <div className="post-template-picker__zoom-row">
                <span className="post-template-picker__zoom-label">Zoom</span>
                <input
                  type="range"
                  className="post-template-picker__zoom-slider"
                  min={1}
                  max={2.8}
                  step={0.01}
                  value={transform.scale}
                  onChange={(e) => updateScale(Number(e.target.value))}
                  aria-label="Zoom photo"
                />
                <button
                  type="button"
                  className="post-template-picker__reset"
                  onClick={resetTransform}
                >
                  Reset
                </button>
              </div>
              <p className="post-template-picker__edit-hint">
                Drag to reposition · Pinch or slide to zoom
              </p>
            </div>

            <div className="post-template-picker__list" role="listbox" aria-label="Photo templates">
              {POST_TEMPLATES.map((template) => {
                const isActive = template.id === activeTemplateId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    aria-label={template.label}
                    className={`post-template-picker__item ${isActive ? 'post-template-picker__item--active' : ''}`}
                    onClick={() => setActiveTemplateId(template.id)}
                  >
                    <span className="post-template-picker__thumb-wrap">
                      <img
                        src={template.previewImage}
                        alt=""
                        className="post-template-picker__thumb"
                        width={52}
                        height={52}
                        draggable={false}
                      />
                      <span className="post-template-picker__thumb-icon">
                        <TemplateIcon id={template.id} />
                      </span>
                    </span>
                    <span className="post-template-picker__name">{template.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className="post-template-picker__use-btn"
          disabled={isApplying}
          onClick={() => void handleUsePhoto()}
        >
          {isApplying ? 'Saving…' : 'Use photo'}
        </button>
      </div>
    </ProfileSheet>
  );
}
