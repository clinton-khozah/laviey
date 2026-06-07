import { useEffect, useRef, useState } from 'react';

interface VerifyCameraStepProps {
  stepLabel: string;
  title: string;
  hint: string;
  poseGuide?: string;
  /** Prefer live camera; hide gallery upload when verifying identity */
  liveOnly?: boolean;
  onBack: () => void;
  onCapture: (dataUrl: string) => void;
}

export function VerifyCameraStep({
  stepLabel,
  title,
  hint,
  poseGuide,
  liveOnly,
  onBack,
  onCapture,
}: VerifyCameraStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(true);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
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
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  const captureFromVideo = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPreviewUrl(dataUrl);
  };

  const handleFile = (file: File | undefined) => {
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const confirmPhoto = () => {
    if (previewUrl) onCapture(previewUrl);
  };

  const retake = () => setPreviewUrl(null);

  return (
    <div className="verify-camera-step">
      <p className="verify-camera-step__step-label">{stepLabel}</p>
      <h3 className="verify-camera-step__title">{title}</h3>
      <p className="verify-camera-step__hint">{hint}</p>

      <div className="verify-camera-step__frame">
        {previewUrl ? (
          <img src={previewUrl} alt="Captured" className="verify-camera-step__preview" />
        ) : cameraError ? (
          <div className="verify-camera-step__fallback">
            <span className="verify-camera-step__fallback-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </span>
            <p>{liveOnly ? 'Camera access is required for live verification.' : 'Camera unavailable — upload a photo instead'}</p>
            {!liveOnly && (
              <button type="button" className="verify-camera-step__upload-btn" onClick={() => fileRef.current?.click()}>
                Choose photo
              </button>
            )}
          </div>
        ) : (
          <>
            <video ref={videoRef} className="verify-camera-step__video" playsInline muted />
            {poseGuide && <p className="verify-camera-step__pose">{poseGuide}</p>}
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="verify-camera-step__file-input"
        onChange={(e) => handleFile(e.target.files?.[0])}
        aria-hidden
        tabIndex={-1}
      />

      {previewUrl ? (
        <div className="verify-camera-step__actions">
          <button type="button" className="verify-identity-sheet__btn" onClick={confirmPhoto}>
            Use this photo
          </button>
          <button type="button" className="verify-identity-sheet__btn verify-identity-sheet__btn--secondary" onClick={retake}>
            Retake
          </button>
        </div>
      ) : (
        <div className="verify-camera-step__actions">
          {!cameraError && (
            <button
              type="button"
              className="verify-camera-step__shutter"
              onClick={captureFromVideo}
              disabled={!cameraReady}
              aria-label="Take photo"
            />
          )}
          {!liveOnly && (
            <button
              type="button"
              className="verify-identity-sheet__btn verify-identity-sheet__btn--secondary"
              onClick={() => fileRef.current?.click()}
            >
              Upload photo
            </button>
          )}
        </div>
      )}

      <button type="button" className="verify-camera-step__back" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
