import { useRef, useState } from 'react';

interface ReferenceUploadStepProps {
  onBack: () => void;
  onContinue: (dataUrl: string) => void;
}

export function ReferenceUploadStep({ onBack, onContinue }: ReferenceUploadStepProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPreviewUrl(reader.result);
    };
    reader.onerror = () => setError('Could not read that image.');
    reader.readAsDataURL(file);
  };

  return (
    <div className="verify-camera-step">
      <p className="verify-camera-step__step-label">Step 1 of 2</p>
      <h3 className="verify-camera-step__title">Upload a reference photo</h3>
      <p className="verify-camera-step__hint">
        Choose a clear photo of your face from your gallery. We&apos;ll compare it to a live selfie next.
      </p>

      <div className="verify-camera-step__frame verify-camera-step__frame--upload">
        {previewUrl ? (
          <img src={previewUrl} alt="Reference face" className="verify-camera-step__preview verify-camera-step__preview--static" />
        ) : (
          <button
            type="button"
            className="verify-camera-step__upload-zone"
            onClick={() => fileRef.current?.click()}
          >
            <span className="verify-camera-step__fallback-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </span>
            <strong>Choose from gallery</strong>
            <span>JPG or PNG · front-facing photo</span>
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="verify-camera-step__file-input"
        onChange={(e) => handleFile(e.target.files?.[0])}
        aria-hidden
        tabIndex={-1}
      />

      {error && <p className="verify-face-match__error">{error}</p>}

      {previewUrl ? (
        <div className="verify-camera-step__actions">
          <button type="button" className="verify-identity-sheet__btn" onClick={() => onContinue(previewUrl)}>
            Continue
          </button>
          <button
            type="button"
            className="verify-identity-sheet__btn verify-identity-sheet__btn--secondary"
            onClick={() => {
              setPreviewUrl(null);
              setError(null);
            }}
          >
            Choose another
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="verify-identity-sheet__btn verify-identity-sheet__btn--secondary"
          onClick={() => fileRef.current?.click()}
        >
          Open gallery
        </button>
      )}

      <button type="button" className="verify-camera-step__back" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
