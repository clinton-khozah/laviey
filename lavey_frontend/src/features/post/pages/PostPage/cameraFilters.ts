export interface CameraFilter {
  id: string;
  name: string;
  css: string;
  washes?: string[];
  girly?: boolean;
}

export const CAMERA_FILTERS: CameraFilter[] = [
  { id: 'natural', name: 'Natural', css: 'none' },
  {
    id: 'lovy',
    name: 'Lovy',
    girly: true,
    css: 'brightness(1.18) contrast(0.82) saturate(1.35) hue-rotate(14deg) sepia(0.14)',
    washes: [
      'radial-gradient(ellipse 90% 70% at 50% 28%, rgba(255, 190, 215, 0.55) 0%, transparent 62%)',
      'linear-gradient(180deg, rgba(255, 170, 200, 0.28) 0%, transparent 38%, rgba(255, 130, 175, 0.18) 100%)',
    ],
  },
  {
    id: 'clarendon',
    name: 'Clarendon',
    css: 'brightness(1.1) contrast(1.28) saturate(1.35)',
  },
  {
    id: 'valencia',
    name: 'Valencia',
    css: 'sepia(0.22) brightness(1.12) contrast(1.1) saturate(1.2)',
  },
  {
    id: 'juno',
    name: 'Juno',
    css: 'sepia(0.28) contrast(1.2) brightness(1.08) saturate(1.4) hue-rotate(-8deg)',
  },
  {
    id: 'lark',
    name: 'Lark',
    css: 'brightness(1.18) contrast(0.86) saturate(0.8)',
  },
  {
    id: 'aden',
    name: 'Aden',
    css: 'hue-rotate(-18deg) contrast(0.86) saturate(0.78) brightness(1.14)',
  },
  {
    id: 'gingham',
    name: 'Gingham',
    css: 'brightness(1.08) sepia(0.14) contrast(0.9) saturate(0.88)',
  },
  {
    id: 'lofi',
    name: 'Lo-Fi',
    css: 'contrast(1.38) saturate(1.28) brightness(0.92)',
  },
  {
    id: 'willow',
    name: 'Willow',
    css: 'grayscale(1) contrast(1.12) brightness(1.08)',
  },
];

export const DEFAULT_CAMERA_FILTER_ID = CAMERA_FILTERS[0].id;

export const FILTER_PREVIEW_FLOWER = '/images/camera-filter-flower.jpg';

export function getCameraFilter(id: string): CameraFilter {
  return CAMERA_FILTERS.find((f) => f.id === id) ?? CAMERA_FILTERS[0];
}

export function drawFilteredVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  filter: CameraFilter,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw === 0 || vh === 0 || canvasWidth === 0 || canvasHeight === 0) return;

  const scale = Math.max(canvasWidth / vw, canvasHeight / vh);
  const srcW = canvasWidth / scale;
  const srcH = canvasHeight / scale;
  const srcX = (vw - srcW) / 2;
  const srcY = (vh - srcH) / 2;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = filter.css === 'none' ? 'none' : filter.css;
  ctx.translate(canvasWidth, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  applyFilterWashesToCanvas(ctx, canvasWidth, canvasHeight, filter);
}

function applyFilterWashesToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filter: CameraFilter,
): void {
  if (!filter.washes?.length) return;

  ctx.save();

  const glow = ctx.createRadialGradient(
    width * 0.5,
    height * 0.28,
    width * 0.04,
    width * 0.5,
    height * 0.28,
    width * 0.75,
  );
  glow.addColorStop(0, 'rgba(255, 180, 210, 0.52)');
  glow.addColorStop(1, 'rgba(255, 180, 210, 0)');
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const blush = ctx.createLinearGradient(0, 0, 0, height);
  blush.addColorStop(0, 'rgba(255, 160, 195, 0.26)');
  blush.addColorStop(0.5, 'rgba(255, 160, 195, 0)');
  blush.addColorStop(1, 'rgba(255, 120, 165, 0.16)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = blush;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}
