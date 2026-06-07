import previewNone from '@/assets/post-templates/none.jpg';
import overlaySingle from '@/assets/post-templates/single.png';
import overlayOpenRelationship from '@/assets/post-templates/open-relationship.png';
import overlaySeriousRelationship from '@/assets/post-templates/serious-relationship.png';
import overlayJustFriends from '@/assets/post-templates/just-friends.png';

export interface PostTemplate {
  id: string;
  label: string;
  shortLabel: string;
  emoji: string;
  text: string;
  bg: [string, string];
  textColor: string;
  previewImage: string;
  /** Full-frame PNG overlay with transparent photo window */
  overlayImage?: string;
}

export const TEMPLATE_SAMPLE_URL = '/images/post-template-sample.jpg';

export const POST_TEMPLATES: PostTemplate[] = [
  {
    id: 'none',
    label: 'Original',
    shortLabel: 'Original',
    emoji: '🖼️',
    text: '',
    bg: ['transparent', 'transparent'],
    textColor: '#ffffff',
    previewImage: previewNone,
  },
  {
    id: 'single',
    label: 'Single',
    shortLabel: 'Single',
    emoji: '✨',
    text: '✨ Single',
    bg: ['rgba(255, 77, 109, 0.92)', 'rgba(236, 72, 153, 0.92)'],
    textColor: '#ffffff',
    previewImage: overlaySingle,
    overlayImage: overlaySingle,
  },
  {
    id: 'open-relationship',
    label: 'Open relationship',
    shortLabel: 'Open',
    emoji: '💜',
    text: '💜 Open relationship',
    bg: ['rgba(124, 58, 237, 0.92)', 'rgba(168, 85, 247, 0.92)'],
    textColor: '#ffffff',
    previewImage: overlayOpenRelationship,
    overlayImage: overlayOpenRelationship,
  },
  {
    id: 'serious-relationship',
    label: 'Serious relationship',
    shortLabel: 'Serious',
    emoji: '💍',
    text: '💍 Serious relationship',
    bg: ['rgba(190, 24, 93, 0.92)', 'rgba(225, 29, 72, 0.92)'],
    textColor: '#ffffff',
    previewImage: overlaySeriousRelationship,
    overlayImage: overlaySeriousRelationship,
  },
  {
    id: 'just-friends',
    label: 'Just friends',
    shortLabel: 'Friends',
    emoji: '🤝',
    text: '🤝 Just friends',
    bg: ['rgba(16, 185, 129, 0.92)', 'rgba(52, 211, 153, 0.92)'],
    textColor: '#ffffff',
    previewImage: overlayJustFriends,
    overlayImage: overlayJustFriends,
  },
];

export const DEFAULT_POST_TEMPLATE_ID = POST_TEMPLATES[0].id;

export function getPostTemplate(id: string): PostTemplate {
  return POST_TEMPLATES.find((t) => t.id === id) ?? POST_TEMPLATES[0];
}

export function templateStickerGradient(template: PostTemplate): string {
  return `linear-gradient(90deg, ${template.bg[0]}, ${template.bg[1]})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  if (iw === 0 || ih === 0) return;

  const scale = Math.max(width / iw, height / ih);
  const srcW = width / scale;
  const srcH = height / scale;
  const srcX = (iw - srcW) / 2;
  const srcY = (ih - srcH) / 2;

  ctx.drawImage(image, srcX, srcY, srcW, srcH, x, y, width, height);
}

function drawTextSticker(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: PostTemplate,
): void {
  if (template.id === 'none' || !template.text) return;

  const padX = width * 0.06;
  const barH = Math.max(44, height * 0.09);
  const y = height - barH - height * 0.05;
  const barW = width - padX * 2;

  const grad = ctx.createLinearGradient(padX, y, padX + barW, y + barH);
  grad.addColorStop(0, template.bg[0]);
  grad.addColorStop(1, template.bg[1]);

  ctx.save();
  roundRect(ctx, padX, y, barW, barH, barH * 0.35);
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = template.textColor;
  const fontSize = Math.round(barH * 0.34);
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(template.text, width / 2, y + barH / 2);
  ctx.restore();
}

/** Draw video frame with cover crop + mirror (no filters) */
export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
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
  ctx.translate(canvasWidth, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvasWidth, canvasHeight);
  ctx.restore();
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load overlay'));
    img.src = url;
  });
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export async function renderPhotoWithTemplate(
  image: HTMLImageElement,
  template: PostTemplate,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (template.overlayImage) {
    const overlay = await loadImageFromUrl(template.overlayImage);
    canvas.width = overlay.naturalWidth;
    canvas.height = overlay.naturalHeight;
    drawCoverImage(ctx, image, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(overlay, 0, 0);
  } else {
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);
    drawTextSticker(ctx, canvas.width, canvas.height, template);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Export failed'))),
      'image/jpeg',
      0.96,
    );
  });
}

export async function fileWithTemplate(file: File, templateId: string): Promise<File> {
  const template = getPostTemplate(templateId);
  if (template.id === 'none') return file;

  const image = await loadImageFromFile(file);
  const blob = await renderPhotoWithTemplate(image, template);
  return new File([blob], file.name, { type: 'image/jpeg' });
}
