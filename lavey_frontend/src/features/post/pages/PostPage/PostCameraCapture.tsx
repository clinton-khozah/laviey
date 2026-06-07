import { useEffect, useRef, useState } from 'react';
import { AppOverlay } from '@/components/ui/AppOverlay';
import {
  CAMERA_FILTERS,
  DEFAULT_CAMERA_FILTER_ID,
  drawFilteredVideoFrame,
  FILTER_PREVIEW_FLOWER,
  getCameraFilter,
} from './cameraFilters';
import {
  DEFAULT_POST_TEMPLATE_ID,
  fileWithTemplate,
  getPostTemplate,
  POST_TEMPLATES,
  templateStickerGradient,
} from './postTemplates';
import './PostCameraCapture.css';

interface PostCameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export function PostCameraCapture({ open, onClose, onCapture }: PostCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const filterRef = useRef(getCameraFilter(DEFAULT_CAMERA_FILTER_ID));
  const templateRef = useRef(getPostTemplate(DEFAULT_POST_TEMPLATE_ID));
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState(DEFAULT_CAMERA_FILTER_ID);
  const [activeTemplateId, setActiveTemplateId] = useState(DEFAULT_POST_TEMPLATE_ID);

  const activeFilter = getCameraFilter(activeFilterId);
  const activeTemplate = getPostTemplate(activeTemplateId);
  filterRef.current = activeFilter;
  templateRef.current = activeTemplate;

  const usesFrameOverlay = Boolean(activeTemplate.overlayImage);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  };

  useEffect(() => {
    if (!open) {
      stopStream();
      setCameraError(false);
      setIsCapturing(false);
      setActiveFilterId(DEFAULT_CAMERA_FILTER_ID);
      setActiveTemplateId(DEFAULT_POST_TEMPLATE_ID);
      return;
    }

    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(true);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();
        setCameraReady(true);
        setCameraError(false);
      } catch {
        if (!cancelled) setCameraError(true);
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !cameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let rafId = 0;

    const render = () => {
      const stage = stageRef.current;
      const ctx = canvas.getContext('2d');
      if (stage && ctx && video.videoWidth > 0) {
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const canvasW = Math.max(1, Math.round(stage.clientWidth * dpr));
        const canvasH = Math.max(1, Math.round(stage.clientHeight * dpr));
        if (canvas.width !== canvasW || canvas.height !== canvasH) {
          canvas.width = canvasW;
          canvas.height = canvasH;
        }
        drawFilteredVideoFrame(ctx, video, filterRef.current, canvasW, canvasH);
      }
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [open, cameraReady, activeFilterId]);

  const handleClose = () => {
    stopStream();
    onClose();
  };

  const handleShutter = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || isCapturing) return;

    setIsCapturing(true);

    const captureCanvas = document.createElement('canvas');
    const stage = stageRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const previewW = stage ? Math.max(1, Math.round(stage.clientWidth * dpr)) : video.videoWidth;
    const previewH = stage ? Math.max(1, Math.round(stage.clientHeight * dpr)) : video.videoHeight;
    const captureW = Math.max(previewW, Math.min(video.videoWidth, 1920));
    const captureH = Math.max(previewH, Math.round(captureW * (previewH / previewW)));
    captureCanvas.width = captureW;
    captureCanvas.height = captureH;
    const ctx = captureCanvas.getContext('2d');
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    drawFilteredVideoFrame(ctx, video, activeFilter, captureW, captureH);

    captureCanvas.toBlob(
      (blob) => {
        void (async () => {
          try {
            if (!blob) return;
            const rawFile = new File([blob], `lavey-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const file = await fileWithTemplate(rawFile, templateRef.current.id);
            stopStream();
            onCapture(file);
          } finally {
            setIsCapturing(false);
          }
        })();
      },
      'image/jpeg',
      0.96,
    );
  };

  const handleFallbackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    onCapture(file);
    handleClose();
  };

  if (!open) return null;

  return (
    <AppOverlay>
      <div
        className={`post-camera ${activeFilter.girly ? 'post-camera--girly' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Take a photo"
      >
        <header className="post-camera__header">
          <button type="button" className="post-camera__close" onClick={handleClose} aria-label="Close camera">
            ×
          </button>
          <div className="post-camera__templates-bar">
            <div className="post-camera__templates" role="listbox" aria-label="Photo templates">
              {POST_TEMPLATES.map((template) => {
                const isActive = template.id === activeTemplateId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    aria-label={template.label}
                    className={`post-camera__template ${isActive ? 'post-camera__template--active' : ''}`}
                    onClick={() => setActiveTemplateId(template.id)}
                  >
                    <span className="post-camera__template-thumb-wrap">
                      <img
                        src={template.previewImage}
                        alt=""
                        className="post-camera__template-thumb"
                        draggable={false}
                      />
                    </span>
                    <span className="post-camera__template-label">
                      <span className="post-camera__template-emoji" aria-hidden>
                        {template.emoji}
                      </span>
                      <span className="post-camera__template-name">{template.shortLabel}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <span className="post-camera__spacer" aria-hidden />
        </header>

        <div className="post-camera__viewport">
          {cameraError ? (
            <div className="post-camera__fallback">
              <p>Camera access isn&apos;t available here.</p>
              <button
                type="button"
                className="post-camera__fallback-btn"
                onClick={() => fallbackInputRef.current?.click()}
              >
                Open camera app
              </button>
            </div>
          ) : (
            <>
              <div className="post-camera__stage" ref={stageRef}>
                <video ref={videoRef} className="post-camera__video" playsInline muted autoPlay aria-hidden />
                <canvas ref={canvasRef} className="post-camera__canvas" aria-hidden />
                {activeTemplate.id !== 'none' && (
                  <div className="post-camera__template-layer" aria-hidden>
                    <div
                      className={`post-camera__template-frame ${usesFrameOverlay ? 'post-camera__template-frame--overlay' : ''}`}
                    >
                      {usesFrameOverlay && activeTemplate.overlayImage ? (
                        <img
                          src={activeTemplate.overlayImage}
                          alt=""
                          className="post-camera__template-overlay"
                          draggable={false}
                        />
                      ) : activeTemplate.text ? (
                        <div
                          className="post-camera__template-sticker"
                          style={{
                            background: templateStickerGradient(activeTemplate),
                            color: activeTemplate.textColor,
                          }}
                        >
                          {activeTemplate.text}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
                {cameraReady && (
                  <span className="post-camera__hd-badge" aria-label="HD camera">
                    HD
                  </span>
                )}
                <div className="post-camera__vignette" aria-hidden />
              </div>

              {!cameraReady && <p className="post-camera__loading">Starting camera…</p>}

              <div className="post-camera__bottom">
                <button
                  type="button"
                  className="post-camera__shutter"
                  onClick={() => void handleShutter()}
                  disabled={!cameraReady || isCapturing}
                  aria-label="Capture photo"
                />

                <div className="post-camera__filters" role="listbox" aria-label="Photo filters">
                  {CAMERA_FILTERS.map((filter) => {
                    const isActive = filter.id === activeFilterId;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        aria-label={filter.name}
                        className={`post-camera__filter ${isActive ? 'post-camera__filter--active' : ''} ${filter.girly ? 'post-camera__filter--girly' : ''}`}
                        onClick={() => setActiveFilterId(filter.id)}
                      >
                        <span className="post-camera__filter-thumb-wrap">
                          <img
                            src={FILTER_PREVIEW_FLOWER}
                            alt=""
                            className="post-camera__filter-thumb"
                            style={{ filter: filter.css === 'none' ? undefined : filter.css }}
                            draggable={false}
                          />
                          {filter.washes?.map((wash, index) => (
                            <span
                              key={`${filter.id}-thumb-wash-${index}`}
                              className="post-camera__filter-thumb-wash"
                              style={{ background: wash }}
                              aria-hidden
                            />
                          ))}
                        </span>
                        <span className="post-camera__filter-name">{filter.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <input
          ref={fallbackInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="post-camera__file-input"
          onChange={handleFallbackChange}
          aria-hidden
          tabIndex={-1}
        />
      </div>
    </AppOverlay>
  );
}
