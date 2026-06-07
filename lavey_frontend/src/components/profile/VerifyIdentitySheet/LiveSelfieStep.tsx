import { useEffect, useRef, useState } from 'react';
import {
  runLiveLivenessChallenge,
  type LivenessProgress,
} from '@/utils/face/faceLiveness';
import { faceMatchUserMessage } from '@/utils/face/faceMatcher';

interface LiveSelfieStepProps {
  onBack: () => void;
  onCapture: (dataUrl: string) => void;
}

export function LiveSelfieStep({ onBack, onCapture }: LiveSelfieStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [liveness, setLiveness] = useState<LivenessProgress>({
    phase: 'loading',
    message: 'Allow camera access to continue.',
    progress: 0,
  });
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const startLiveness = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;

    setIsChecking(true);
    setError(null);
    setCapturedUrl(null);

    const signal = { cancelled: false };

    try {
      const result = await runLiveLivenessChallenge(video, setLiveness, signal);
      setCapturedUrl(result.dataUrl);
      setLiveness({
        phase: 'ready',
        message: 'Live check passed. Confirm to continue.',
        progress: 1,
      });
    } catch (err) {
      setError(faceMatchUserMessage(err));
      setLiveness((current) => ({
        ...current,
        phase: 'failed',
        message: faceMatchUserMessage(err),
      }));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="verify-camera-step">
      <p className="verify-camera-step__step-label">Step 2 of 2</p>
      <h3 className="verify-camera-step__title">Live selfie check</h3>
      <p className="verify-camera-step__hint">
        Look straight at the camera — we compare your live selfie to your reference photo on this device.
      </p>

      <div className="verify-camera-step__frame">
        {capturedUrl ? (
          <img src={capturedUrl} alt="Live capture" className="verify-camera-step__preview" />
        ) : cameraError ? (
          <div className="verify-camera-step__fallback">
            <span className="verify-camera-step__fallback-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </span>
            <p>Camera access is required. Enable your front camera in browser settings, then try again.</p>
          </div>
        ) : (
          <video ref={videoRef} className="verify-camera-step__video" playsInline muted />
        )}
      </div>

      {isChecking ? (
        <div className="verify-liveness__bar" aria-hidden>
          <span
            className="verify-liveness__bar-fill"
            style={{ width: `${Math.round(liveness.progress * 100)}%` }}
          />
        </div>
      ) : null}
      <p className="verify-liveness__status" aria-live="polite">
        {liveness.message}
      </p>
      {error && <p className="verify-face-match__error">{error}</p>}

      {capturedUrl ? (
        <div className="verify-camera-step__actions">
          <button type="button" className="verify-identity-sheet__btn" onClick={() => onCapture(capturedUrl)}>
            Use this live photo
          </button>
          <button
            type="button"
            className="verify-identity-sheet__btn verify-identity-sheet__btn--secondary"
            onClick={() => {
              setCapturedUrl(null);
              setError(null);
              setLiveness({ phase: 'center', message: 'Look straight at the camera.', progress: 0.1 });
            }}
          >
            Redo live check
          </button>
        </div>
      ) : (
        <div className="verify-camera-step__actions">
          <button
            type="button"
            className="verify-identity-sheet__btn"
            disabled={!cameraReady || isChecking || cameraError}
            onClick={() => void startLiveness()}
          >
            Start live check
          </button>
        </div>
      )}

      <button type="button" className="verify-camera-step__back" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
