import { useEffect, useRef, useState } from 'react';
import './ImageCropDialog.css';

type Props = { file: File; aspect: number; title: string; onCancel(): void; onComplete(file: File): Promise<void> | void };

export function ImageCropDialog({ file, aspect, title, onCancel, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const next = new Image();
    next.onload = () => setImage(next);
    next.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const width = 600;
    const height = Math.round(width / aspect);
    canvas.width = width; canvas.height = height;
    const imageAspect = image.naturalWidth / image.naturalHeight;
    let baseWidth = image.naturalWidth; let baseHeight = image.naturalHeight;
    if (imageAspect > aspect) baseWidth = image.naturalHeight * aspect;
    else baseHeight = image.naturalWidth / aspect;
    const cropWidth = baseWidth / zoom; const cropHeight = baseHeight / zoom;
    const roomX = image.naturalWidth - cropWidth; const roomY = image.naturalHeight - cropHeight;
    const sourceX = roomX * ((positionX + 100) / 200);
    const sourceY = roomY * ((positionY + 100) / 200);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, width, height);
  }, [aspect, image, positionX, positionY, zoom]);

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not crop image')), 'image/jpeg', .9));
      await onComplete(new File([blob], file.name.replace(/\.[^.]+$/, '') + '-cropped.jpg', { type: 'image/jpeg' }));
    } finally { setSaving(false); }
  }

  return <div className="ai-image-crop__backdrop"><section className="ai-image-crop" role="dialog" aria-modal="true"><header><div><h3>{title}</h3><p>Move the sliders until the photo fits the frame.</p></div><button type="button" onClick={onCancel} aria-label="Close">×</button></header><div className="ai-image-crop__preview"><canvas ref={canvasRef} /></div><div className="ai-image-crop__controls"><label>Zoom<input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label><label>Horizontal position<input type="range" min="-100" max="100" value={positionX} onChange={(event) => setPositionX(Number(event.target.value))} /></label><label>Vertical position<input type="range" min="-100" max="100" value={positionY} onChange={(event) => setPositionY(Number(event.target.value))} /></label></div><footer><button type="button" onClick={onCancel}>Cancel</button><button type="button" disabled={saving || !image} onClick={() => void save()}>{saving ? 'Uploading…' : 'Crop & upload'}</button></footer></section></div>;
}
