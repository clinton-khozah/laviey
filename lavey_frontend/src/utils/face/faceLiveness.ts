import * as faceapi from '@vladmandic/face-api';
import { FaceMatchError, loadFaceModels } from '@/utils/face/faceMatcher';

export type LivenessPhase = 'loading' | 'center' | 'ready' | 'failed';

export interface LivenessProgress {
  phase: LivenessPhase;
  message: string;
  progress: number;
}

export interface LivenessCaptureResult {
  dataUrl: string;
  yawRange: number;
  motionScore: number;
  livenessPassed: true;
}

const CENTER_YAW_MAX = 0.18;
const STATIC_MOTION_MAX = 0.8;
const LIVE_MOTION_MIN = 0.9;
const STATIC_FRAME_LIMIT = 14;
const CENTER_FRAME_TARGET = 5;
const POLL_MS = 220;

function estimateFaceYaw(
  detection: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>,
): number {
  const landmarks = detection.landmarks;
  const nose = landmarks.getNose()[3];
  const jaw = landmarks.getJawOutline();
  const left = jaw[3];
  const right = jaw[13];
  const centerX = (left.x + right.x) / 2;
  const width = Math.max(1, right.x - left.x);
  return (nose.x - centerX) / width;
}

function faceBoxMotion(
  prevCanvas: HTMLCanvasElement,
  nextCanvas: HTMLCanvasElement,
  box: faceapi.Box,
): number {
  const prevCtx = prevCanvas.getContext('2d', { willReadFrequently: true });
  const nextCtx = nextCanvas.getContext('2d', { willReadFrequently: true });
  if (!prevCtx || !nextCtx) return 0;

  const x = Math.max(0, Math.floor(box.x));
  const y = Math.max(0, Math.floor(box.y));
  const w = Math.min(Math.floor(box.width), prevCanvas.width - x);
  const h = Math.min(Math.floor(box.height), prevCanvas.height - y);
  if (w <= 0 || h <= 0) return 0;

  const prevData = prevCtx.getImageData(x, y, w, h).data;
  const nextData = nextCtx.getImageData(x, y, w, h).data;
  let diff = 0;
  const len = Math.min(prevData.length, nextData.length);

  for (let i = 0; i < len; i += 4) {
    diff +=
      Math.abs(prevData[i]! - nextData[i]!) +
      Math.abs(prevData[i + 1]! - nextData[i + 1]!) +
      Math.abs(prevData[i + 2]! - nextData[i + 2]!);
  }

  const pixels = len / 4;
  return pixels > 0 ? diff / pixels : 0;
}

function captureVideoFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new FaceMatchError('CAPTURE_FAILED', 'Could not capture from camera.');
  ctx.drawImage(video, 0, 0);
  return canvas;
}

async function detectFaceOnVideo(video: HTMLVideoElement) {
  return faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.45 }))
    .withFaceLandmarks();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Front-facing live check — no head turns, no oval framing. */
export async function runLiveLivenessChallenge(
  video: HTMLVideoElement,
  onProgress: (progress: LivenessProgress) => void,
  signal?: { cancelled: boolean },
): Promise<LivenessCaptureResult> {
  await loadFaceModels();

  onProgress({ phase: 'loading', message: 'Look straight at the camera.', progress: 0.05 });

  let centeredFrameCount = 0;
  let minYaw = 0;
  let maxYaw = 0;
  const motionSamples: number[] = [];
  let staticFrameCount = 0;
  let prevCanvas: HTMLCanvasElement | null = null;
  let prevBox: faceapi.Box | null = null;

  const fail = (message: string) => {
    onProgress({ phase: 'failed', message, progress: 0 });
    throw new FaceMatchError('LIVENESS_FAILED', message);
  };

  while (!signal?.cancelled) {
    if (video.videoWidth === 0) {
      await sleep(POLL_MS);
      continue;
    }

    const detection = await detectFaceOnVideo(video);
    const canvas = captureVideoFrame(video);

    if (!detection) {
      centeredFrameCount = 0;
      staticFrameCount = 0;
      onProgress({
        phase: 'center',
        message: 'Look straight at the camera.',
        progress: 0.15,
      });
      prevCanvas = canvas;
      await sleep(POLL_MS);
      continue;
    }

    const yaw = estimateFaceYaw(detection);
    minYaw = Math.min(minYaw, yaw);
    maxYaw = Math.max(maxYaw, yaw);

    if (prevCanvas && prevBox) {
      const motion = faceBoxMotion(prevCanvas, canvas, prevBox);
      motionSamples.push(motion);
      if (motionSamples.length > 24) motionSamples.shift();

      if (motion < STATIC_MOTION_MAX) {
        staticFrameCount += 1;
      } else {
        staticFrameCount = 0;
      }

      if (staticFrameCount >= STATIC_FRAME_LIMIT) {
        fail(
          'This looks like a still photo or screen. Live verification requires your real face on camera — not a picture held up to the lens.',
        );
      }
    }

    prevCanvas = canvas;
    prevBox = detection.detection.box;

    if (Math.abs(yaw) <= CENTER_YAW_MAX) {
      centeredFrameCount += 1;
    } else {
      centeredFrameCount = 0;
    }

    const progress = Math.min(0.95, 0.2 + (centeredFrameCount / CENTER_FRAME_TARGET) * 0.75);

    if (centeredFrameCount >= CENTER_FRAME_TARGET) {
      const avgMotion =
        motionSamples.length > 0
          ? motionSamples.reduce((sum, value) => sum + value, 0) / motionSamples.length
          : 0;

      if (avgMotion < LIVE_MOTION_MIN && motionSamples.length >= 4) {
        fail(
          'We couldn\'t detect natural movement. Please verify with your live face — don\'t use a photo on another screen.',
        );
      }

      onProgress({
        phase: 'ready',
        message: 'Live check passed. Confirm to continue.',
        progress: 1,
      });

      return {
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        yawRange: maxYaw - minYaw,
        motionScore: avgMotion,
        livenessPassed: true,
      };
    }

    onProgress({
      phase: 'center',
      message: centeredFrameCount > 0 ? 'Hold still for a moment…' : 'Look straight at the camera.',
      progress,
    });

    await sleep(POLL_MS);
  }

  throw new FaceMatchError('LIVENESS_CANCELLED', 'Verification cancelled.');
}
