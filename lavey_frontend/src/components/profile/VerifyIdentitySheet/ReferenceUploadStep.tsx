import { useRef, useState } from 'react';

interface ReferenceUploadStepProps {
  /** Current profile photo — offered as the default reference when available */
  profilePhotoUrl: string | null;
  onBack: () => void;
  onContinue: (imageUrl: string) => void;
}

export function ReferenceUploadStep({
  profilePhotoUrl,
  onBack,
  onContinue,
}: ReferenceUploadStepProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const hasProfilePhoto = Boolean(profilePhotoUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(profilePhotoUrl);
  const [source, setSource] = useState<'profile' | 'gallery' | null>(
    profilePhotoUrl ? 'profile' : null,
  );
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
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result);
        setSource('gallery');
      }
    };
    reader.onerror = () => setError('Could not read that image.');
    reader.readAsDataURL(file);
  };

  const useProfilePhoto = () => {
    if (!profilePhotoUrl) return;
    setPreviewUrl(profilePhotoUrl);
    setSource('profile');
    setError(null);
  };

  return (
    <div className="verify-camera-step verify-reference-step">
      <p className="verify-camera-step__step-label">Step 1 of 2</p>
      <h3 className="verify-camera-step__title">Choose your reference photo</h3>
      <p className="verify-camera-step__hint">
        {hasProfilePhoto
          ? 'Use your current profile photo or pick a different one from your gallery. We compare it to a live selfie next.'
          : 'Choose a clear front-facing photo from your gallery. We compare it to a live selfie next.'}
      </p>

      <div className="verify-reference-step__layout">
        <div className="verify-reference-step__preview-col">
          <span className="verify-reference-step__preview-label">Reference</span>
          <div className="verify-camera-step__frame verify-camera-step__frame--upload verify-reference-step__frame">
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt="Reference face"
                  className="verify-camera-step__preview verify-camera-step__preview--static"
                />
                {source === 'profile' && (
                  <span className="verify-reference-step__source-badge">Profile photo</span>
                )}
              </>
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
                <strong>Upload from gallery</strong>
                <span>JPG or PNG · front-facing photo</span>
              </button>
            )}
          </div>
        </div>
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

      <div className="verify-reference-step__choices">
        {hasProfilePhoto && (
          <button
            type="button"
            className={`verify-reference-step__choice ${source === 'profile' ? 'verify-reference-step__choice--active' : ''}`}
            onClick={useProfilePhoto}
          >
            <span className="verify-reference-step__choice-thumb" aria-hidden>
              <img src={profilePhotoUrl!} alt="" />
            </span>
            <span className="verify-reference-step__choice-text">
              <strong>Use profile photo</strong>
              <small>Current photo on your profile</small>
            </span>
          </button>
        )}
        <button
          type="button"
          className={`verify-reference-step__choice ${source === 'gallery' ? 'verify-reference-step__choice--active' : ''}`}
          onClick={() => fileRef.current?.click()}
        >
          <span className="verify-reference-step__choice-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </span>
          <span className="verify-reference-step__choice-text">
            <strong>Upload from gallery</strong>
            <small>Pick a different photo</small>
          </span>
        </button>
      </div>

      {previewUrl ? (
        <div className="verify-camera-step__actions">
          <button type="button" className="verify-identity-sheet__btn" onClick={() => onContinue(previewUrl)}>
            Continue
          </button>
          {source === 'gallery' && hasProfilePhoto ? (
            <button
              type="button"
              className="verify-identity-sheet__btn verify-identity-sheet__btn--secondary"
              onClick={useProfilePhoto}
            >
              Back to profile photo
            </button>
          ) : source === 'profile' ? (
            <button
              type="button"
              className="verify-identity-sheet__btn verify-identity-sheet__btn--secondary"
              onClick={() => fileRef.current?.click()}
            >
              Choose from gallery
            </button>
          ) : (
            <button
              type="button"
              className="verify-identity-sheet__btn verify-identity-sheet__btn--secondary"
              onClick={() => {
                setPreviewUrl(null);
                setSource(null);
                setError(null);
              }}
            >
              Choose another
            </button>
          )}
        </div>
      ) : null}

      <button type="button" className="verify-camera-step__back" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
