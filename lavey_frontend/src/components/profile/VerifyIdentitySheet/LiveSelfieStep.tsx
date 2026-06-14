import { useCallback, useEffect, useRef, useState } from 'react';
import {
  runLiveLivenessChallenge,
  type LivenessProgress,
} from '@/utils/face/faceLiveness';
import { faceMatchUserMessage } from '@/utils/face/faceMatcher';

type CameraPhase = 'consent' | 'starting' | 'ready' | 'error';

interface LiveSelfieStepProps {
  onBack: () => void;
  onCapture: (dataUrl: string) => void;
}

export function LiveSelfieStep({ onBack, onCapture }: LiveSelfieStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraPhase, setCameraPhase] = useState<CameraPhase>('consent');
  const [isChecking, setIsChecking] = useState(false);
  const [liveness, setLiveness] = useState<LivenessProgress>({
    phase: 'loading',
    message: 'Tap Allow camera to begin your live check.',
    progress: 0,
  });
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const runLivenessOnVideo = useCallback(async (video: HTMLVideoElement) => {
    setIsChecking(true);
    setError(null);
    setCapturedUrl(null);
    setLiveness({
      phase: 'center',
      message: 'Look straight at the camera.',
      progress: 0.1,
    });

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
  }, []);

  const requestCameraAndVerify = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraPhase('error');
      setError('Camera is not supported on this device.');
      return;
    }

    setCameraPhase('starting');
    setError(null);
    setLiveness({
      phase: 'loading',
      message: 'Starting camera…',
      progress: 0,
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false,
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error('Camera preview is unavailable.');
      }

      video.srcObject = stream;
      await video.play();
      setCameraPhase('ready');
      await runLivenessOnVideo(video);
    } catch (err) {
      stopCamera();
      setCameraPhase('error');
      setError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow camera for this site, then try again.'
          : faceMatchUserMessage(err),
      );
      setLiveness({
        phase: 'failed',
        message: 'Camera access is required for live verification.',
        progress: 0,
      });
    }
  }, [runLivenessOnVideo, stopCamera]);

  const showConsent = cameraPhase === 'consent';
  const showStarting = cameraPhase === 'starting';
  const showCameraError = cameraPhase === 'error';
  const showLiveFeed = cameraPhase === 'ready' && !capturedUrl;

  return (
    <div className="verify-camera-step">
      <p className="verify-camera-step__step-label">Step 2 of 2</p>
      <h3 className="verify-camera-step__title">Live selfie check</h3>
      <p className="verify-camera-step__hint">
        Look straight at the camera — we compare your live selfie to your reference photo on this
        device.
      </p>

      <div className="verify-camera-step__frame">
        {capturedUrl ? (
          <img src={capturedUrl} alt="Live capture" className="verify-camera-step__preview" />
        ) : (
          <>
            <video
              ref={videoRef}
              className="verify-camera-step__video"
              playsInline
              muted
              hidden={!showLiveFeed}
            />
            {showConsent ? (
              <div className="verify-camera-step__consent">
                <span className="verify-camera-step__consent-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </span>
                <p className="verify-camera-step__consent-title">Allow camera access</p>
                <p className="verify-camera-step__consent-copy">
                  Tap below and choose <strong>Allow</strong> when your browser asks. Live verification
                  starts right after.
                </p>
                <button
                  type="button"
                  className="verify-camera-step__consent-btn"
                  onClick={() => void requestCameraAndVerify()}
                >
                  Allow camera
                </button>
              </div>
            ) : showStarting ? (
              <div className="verify-camera-step__overlay" role="status">
                <span
                  className="verify-camera-step__fallback-icon verify-camera-step__fallback-icon--spin"
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </span>
                <p>Waiting for camera permission…</p>
              </div>
            ) : showCameraError ? (
              <div className="verify-camera-step__overlay">
                <span className="verify-camera-step__fallback-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </span>
                <p>{error ?? 'Camera access is required for live verification.'}</p>
                <button
                  type="button"
                  className="verify-camera-step__consent-btn"
                  onClick={() => void requestCameraAndVerify()}
                >
                  Try again
                </button>
              </div>
            ) : null}
          </>
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
      {error && cameraPhase !== 'error' && <p className="verify-face-match__error">{error}</p>}

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
              setCameraPhase('consent');
              stopCamera();
              setLiveness({
                phase: 'loading',
                message: 'Tap Allow camera to begin your live check.',
                progress: 0,
              });
            }}
          >
            Redo live check
          </button>
        </div>
      ) : showLiveFeed && !isChecking && error ? (
        <div className="verify-camera-step__actions">
          <button
            type="button"
            className="verify-identity-sheet__btn"
            onClick={() => {
              const video = videoRef.current;
              if (video) void runLivenessOnVideo(video);
            }}
          >
            Retry live check
          </button>
        </div>
      ) : null}

      <button type="button" className="verify-camera-step__back" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
