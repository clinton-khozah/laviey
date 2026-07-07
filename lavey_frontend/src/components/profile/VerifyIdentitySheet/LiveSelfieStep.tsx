import { useCallback, useEffect, useRef, useState } from 'react';
import {
  runLiveLivenessChallenge,
  type LivenessProgress,
} from '@/utils/face/faceLiveness';
import { faceMatchUserMessage } from '@/utils/face/faceMatcher';
import { acquireFrontCameraStream, cameraAccessUserMessage } from '@/utils/media/cameraAccess';

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

  const captureCurrentFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedUrl(dataUrl);
    setLiveness({
      phase: 'ready',
      message: 'Photo captured. Continue to verification.',
      progress: 1,
    });
    onCapture(dataUrl);
  }, [onCapture]);

  const requestCameraAndVerify = useCallback(async () => {
    if (!window.isSecureContext) {
      setCameraPhase('error');
      setError(cameraAccessUserMessage(new DOMException('insecure', 'NotSupportedError')));
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraPhase('error');
      setError('Camera is not supported in this browser.');
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
      const stream = await acquireFrontCameraStream();

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
      const message = cameraAccessUserMessage(err);
      setCameraPhase('error');
      setError(message);
      setLiveness({
        phase: 'failed',
        message,
        progress: 0,
      });
    }
  }, [runLivenessOnVideo, stopCamera]);

  const showConsent = cameraPhase === 'consent';
  const showStarting = cameraPhase === 'starting';
  const showCameraError = cameraPhase === 'error';
  const showLiveFeed = cameraPhase === 'ready' && !capturedUrl;
  const useLightFrame = showConsent || showStarting || showCameraError;

  return (
    <div className="verify-camera-step">
      <p className="verify-camera-step__step-label">Step 2 of 2</p>
      <h3 className="verify-camera-step__title">Live selfie check</h3>
      <p className="verify-camera-step__hint">
        Tap the capture button when you&apos;re ready. We compare your live selfie to your reference photo on this device.
      </p>

      <div className={`verify-camera-step__frame ${useLightFrame ? 'verify-camera-step__frame--light' : ''}`}>
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
            {showLiveFeed ? (
              <button
                type="button"
                className="verify-camera-step__capture-btn"
                onClick={() => captureCurrentFrame()}
              >
                Capture photo
              </button>
            ) : null}
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
              <div className="verify-camera-step__consent verify-camera-step__consent--status" role="status">
                <span
                  className="verify-camera-step__consent-icon verify-camera-step__fallback-icon--spin"
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </span>
                <p className="verify-camera-step__consent-title">Waiting for camera…</p>
                <p className="verify-camera-step__consent-copy">Choose Allow when your browser asks.</p>
              </div>
            ) : showCameraError ? (
              <div className="verify-camera-step__consent verify-camera-step__consent--status">
                <span className="verify-camera-step__consent-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </span>
                <p className="verify-camera-step__consent-title">Camera unavailable</p>
                <p className="verify-camera-step__consent-copy">{error ?? 'Could not start the camera.'}</p>
                <button
                  type="button"
                  className="verify-camera-step__consent-btn"
                  onClick={() => {
                    setCameraPhase('consent');
                    setError(null);
                    setLiveness({
                      phase: 'loading',
                      message: 'Tap Allow camera to begin your live check.',
                      progress: 0,
                    });
                  }}
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
      {!showCameraError && !showConsent && !showStarting ? (
        <p className="verify-liveness__status" aria-live="polite">
          {liveness.message}
        </p>
      ) : null}
      {error && cameraPhase === 'ready' && !isChecking ? (
        <p className="verify-face-match__error">{error}</p>
      ) : null}

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
