import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageScroller } from '@/components/layout/PageScroller';
import { SheetSaveSuccess } from '@/components/profile/SheetSaveSuccess';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { useUserProfile } from '@/hooks';
import { MAX_PROFILE_POSTS, POST_LIMIT_MESSAGE } from '@/constants/profilePosts';
import { contentService } from '@/services/content/contentService';
import { ImageQualityError, validateImageQuality } from '@/utils/media/imageQualityCheck';
import { validateSafeImage, nsfwImageUserMessage } from '@/utils/media/nsfwImageCheck';
import { prepareImageForUpload } from '@/utils/media/prepareUploadMedia';
import { LogoLoader } from '@/components/ui/LogoLoader';
import { PostCameraCapture } from './PostCameraCapture';
import { PostPhotoTemplatePicker } from './PostPhotoTemplatePicker';
import './PostPage.css';

interface PhotoDraft {
  file: File;
  url: string;
}

interface PendingPhoto {
  file: File;
  url: string;
}

const CAPTION_PLACEHOLDERS = [
  "What's the vibe? #Travel #Coffee",
  'Sunset mood #Adventure #Sunset',
  'Main character moment #Music',
  'Coffee date energy #Food #Coffee',
];

interface PhotoAlert {
  title: string;
  message: string;
}

function postFirstName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return 'Hey';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function buildPhotoAlert(displayName: string, raw: string): PhotoAlert {
  const name = postFirstName(displayName);
  const lower = raw.toLowerCase();

  if (lower.includes('blurry') || lower.includes('low quality')) {
    return {
      title: 'Photo not clear enough',
      message: `${name}, the picture you're uploading isn't clear enough. Please try again with a clear, sharp photo.`,
    };
  }
  if (lower.includes('too dark')) {
    return {
      title: 'Photo too dark',
      message: `${name}, this photo is too dark. Try again somewhere with better lighting.`,
    };
  }
  if (lower.includes('washed out') || lower.includes('overexposed')) {
    return {
      title: 'Lighting looks off',
      message: `${name}, this photo looks washed out. Try a clearer shot with balanced lighting.`,
    };
  }
  if (lower.includes('too small')) {
    return {
      title: 'Resolution too low',
      message: `${name}, this photo is too small. Please upload a higher resolution image.`,
    };
  }
  if (lower.includes('does not look like you') || lower.includes("doesn't look like you")) {
    return {
      title: 'That is not you',
      message: `${name}, this photo does not look like you. Only post pictures where you are in the shot.`,
    };
  }
  if (lower.includes('must be in this photo') || lower.includes('without being in the picture')) {
    return {
      title: 'You need to be in the photo',
      message: `${name}, you must be in this photo. You cannot post someone else without being in the picture too.`,
    };
  }
  if (lower.includes('profile photo first')) {
    return {
      title: 'Add a profile photo first',
      message: `${name}, upload a clear profile photo first so we can verify you are in your posts.`,
    };
  }
  if (lower.includes('could not detect anyone')) {
    return {
      title: 'Face not visible',
      message: `${name}, we could not see you clearly in this photo. Try a sharper, well-lit picture.`,
    };
  }

  return {
    title: "Couldn't use this photo",
    message: `${name}, ${raw}`,
  };
}

function extractTagsFromCaption(text: string): string[] {
  const tags = [...text.matchAll(/#([A-Za-z][\w]*)/g)].map((match) => match[1]);
  return [...new Set(tags)].slice(0, 4);
}

export function PostPage() {
  const { profile, refetch } = useUserProfile();
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [draft, setDraft] = useState<PhotoDraft | null>(null);
  const [caption, setCaption] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isValidatingPhoto, setIsValidatingPhoto] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [photoAlert, setPhotoAlert] = useState<PhotoAlert | null>(null);
  const [photoCompliment, setPhotoCompliment] = useState<string | null>(null);
  const [isLoadingCompliment, setIsLoadingCompliment] = useState(false);
  const complimentRequestRef = useRef(0);
  const placeholder = useMemo(
    () => CAPTION_PLACEHOLDERS[Math.floor(Math.random() * CAPTION_PLACEHOLDERS.length)],
    [],
  );

  const clearDraft = useCallback(() => {
    if (draft?.url) URL.revokeObjectURL(draft.url);
    setDraft(null);
    setPhotoCompliment(null);
    setIsLoadingCompliment(false);
    complimentRequestRef.current += 1;
  }, [draft]);

  const setDraftFile = useCallback((file: File) => {
    setPhotoCompliment(null);
    setDraft((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
  }, []);

  useEffect(() => {
    if (!draft?.file) return;

    const requestId = complimentRequestRef.current + 1;
    complimentRequestRef.current = requestId;
    setIsLoadingCompliment(true);

    void (async () => {
      try {
        const result = await contentService.getPhotoCompliment(
          draft.file,
          profile?.displayName ?? '',
        );
        if (complimentRequestRef.current !== requestId) return;
        setPhotoCompliment(result.compliment);
      } catch {
        if (complimentRequestRef.current !== requestId) return;
        setPhotoCompliment(null);
      } finally {
        if (complimentRequestRef.current === requestId) {
          setIsLoadingCompliment(false);
        }
      }
    })();
  }, [draft?.file, profile?.displayName]);

  const validatePhoto = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Please choose a photo file.');
    }
    await validateSafeImage(file);
    await validateImageQuality(file);
  }, []);

  const showPhotoAlert = useCallback(
    (err: unknown) => {
      const raw = nsfwImageUserMessage(err);
      setPhotoAlert(buildPhotoAlert(profile?.displayName ?? '', raw));
    },
    [profile?.displayName],
  );

  const acceptPhoto = useCallback(
    async (file: File, onValid: (validFile: File) => void) => {
      setPhotoAlert(null);
      setPublishError(null);
      setIsValidatingPhoto(true);
      try {
        await validatePhoto(file);
        onValid(file);
      } catch (err) {
        showPhotoAlert(err);
      } finally {
        setIsValidatingPhoto(false);
      }
    },
    [showPhotoAlert, validatePhoto],
  );

  const openTemplatePicker = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsCameraOpen(false);
    setPendingPhoto({ file, url: URL.createObjectURL(file) });
  }, []);

  const handleCameraCapture = useCallback(
    (file: File) => {
      openTemplatePicker(file);
    },
    [openTemplatePicker],
  );

  const closeTemplatePicker = useCallback(() => {
    setPendingPhoto((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  const handleTemplateApply = useCallback(
    (file: File) => {
      closeTemplatePicker();
      void acceptPhoto(file, setDraftFile);
    },
    [acceptPhoto, closeTemplatePicker, setDraftFile],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openTemplatePicker(file);
    e.target.value = '';
  };

  const postCount = profile?.posts.length ?? 0;
  const atPostLimit = postCount >= MAX_PROFILE_POSTS;

  const handlePublish = async () => {
    if (!draft) return;
    if (atPostLimit) {
      setPublishError(POST_LIMIT_MESSAGE);
      return;
    }
    setPublishError(null);
    setIsPublishing(true);
    try {
      const prepared = await prepareImageForUpload(draft.file, undefined, { galleryUpload: true });
      const trimmedCaption = caption.trim();
      const tags = extractTagsFromCaption(trimmedCaption);
      await contentService.createPost({
        file: prepared,
        caption: trimmedCaption || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      await refetch();
      setShowSuccess(true);
    } catch (err) {
      const message = nsfwImageUserMessage(err);
      if (message.includes('POST_LIMIT') || message.includes('at most')) {
        setPublishError(POST_LIMIT_MESSAGE);
      } else if (err instanceof ImageQualityError) {
        showPhotoAlert(err);
      } else {
        setPublishError(message);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSuccessDone = () => {
    clearDraft();
    setCaption('');
    setPhotoAlert(null);
    setPhotoCompliment(null);
    setPublishError(null);
    setShowSuccess(false);
  };

  const handleUseComplimentAsCaption = () => {
    if (!photoCompliment) return;
    setCaption(photoCompliment.slice(0, 120));
  };

  const canPublish = Boolean(draft) && !isPublishing;

  return (
    <div className="post-page">
      <PageScroller className="post-page__scroll">
        <header className="post-page__header">
          <div className="post-page__header-glow" aria-hidden />
          <p className="post-page__eyebrow">New post</p>
          <h1 className="post-page__title">Post a pic</h1>
          <p className="post-page__subtitle">Vertical phone pics only — clear and well-lit</p>
        </header>

        <div className="post-page__body">
            <div className="post-page__upload-panel">
              <button
                type="button"
                className={`post-page__preview ${
                  isValidatingPhoto || isPublishing
                    ? 'post-page__preview--loading'
                    : draft
                      ? 'post-page__preview--filled'
                      : 'post-page__preview--empty'
                }`}
                onClick={() => !draft && !isValidatingPhoto && !isPublishing && galleryInputRef.current?.click()}
                disabled={isValidatingPhoto || isPublishing}
                aria-label={
                  isValidatingPhoto || isPublishing
                    ? 'Loading photo'
                    : draft
                      ? 'Photo preview'
                      : 'Choose a photo'
                }
                aria-busy={isValidatingPhoto || isPublishing}
              >
                {isValidatingPhoto || isPublishing ? (
                  <span className="post-page__preview-loader" aria-live="polite">
                    <LogoLoader size="lg" label="Loading photo" />
                  </span>
                ) : !draft ? (
                  <div className="post-page__preview-empty">
                    <span className="post-page__preview-frame" aria-hidden />
                    <span className="post-page__preview-icon" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="M12 16v-8M9 11l3-3 3 3" />
                        <rect x="4" y="4" width="16" height="16" rx="3" />
                      </svg>
                    </span>
                    <p className="post-page__preview-label">Tap to add your pic</p>
                    <span className="post-page__preview-hint">Portrait · clear · you in frame</span>
                  </div>
                ) : (
                  <img className="post-page__preview-media" src={draft.url} alt="Your post preview" />
                )}

                {draft && !isValidatingPhoto && !isPublishing && (
                  <button
                    type="button"
                    className="post-page__preview-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearDraft();
                    }}
                    aria-label="Remove photo"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {draft && !isValidatingPhoto && !isPublishing && (
                  <span className="post-page__preview-badge" aria-hidden>
                    Photo added
                  </span>
                )}
              </button>

              <div className="post-page__actions">
                <button
                  type="button"
                  className="post-page__action-card post-page__action-card--camera"
                  onClick={() => setIsCameraOpen(true)}
                >
                  <span className="post-page__action-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                      <circle cx="12" cy="13" r="3.5" />
                    </svg>
                  </span>
                  <span className="post-page__action-text">
                    <strong>Take photo</strong>
                    <small>Snap something now</small>
                  </span>
                </button>
                <button
                  type="button"
                  className="post-page__action-card post-page__action-card--gallery"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <span className="post-page__action-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <rect x="3" y="3" width="18" height="18" rx="2.5" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </span>
                  <span className="post-page__action-text">
                    <strong>From gallery</strong>
                    <small>Pick your favorite</small>
                  </span>
                </button>
              </div>
            </div>

            {draft && (isLoadingCompliment || photoCompliment) ? (
              <section className="post-page__compliment" aria-live="polite">
                <div className="post-page__compliment-head">
                  <span className="post-page__compliment-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M12 21s-6-4.35-8-7.5C2.5 11.2 4.5 8 8 8c2 0 3.2 1.2 4 2.5C13.8 9.2 15 8 17 8c3.5 0 5.5 3.2 4 5.5-2 3.15-8 7.5-8 7.5z" />
                    </svg>
                  </span>
                  <p className="post-page__compliment-label">Loviey noticed</p>
                </div>
                {isLoadingCompliment ? (
                  <p className="post-page__compliment-text post-page__compliment-text--loading">
                    Scanning your pic for something nice…
                  </p>
                ) : (
                  <>
                    <p className="post-page__compliment-text">{photoCompliment}</p>
                    <button
                      type="button"
                      className="post-page__compliment-btn"
                      onClick={handleUseComplimentAsCaption}
                    >
                      Use as caption
                    </button>
                  </>
                )}
              </section>
            ) : null}

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="post-page__file-input"
              onChange={handleFileChange}
              aria-hidden
              tabIndex={-1}
            />

            <section className="post-page__card">
              <div className="post-page__card-head">
                <label className="post-page__section-label" htmlFor="post-caption">
                  Caption
                </label>
                <span className="post-page__optional">optional</span>
              </div>
              <textarea
                id="post-caption"
                className="post-page__caption"
                placeholder={placeholder}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={120}
                rows={2}
              />
              <p className="post-page__caption-hint">Add up to 4 hashtags in your caption — e.g. #Travel #Music</p>
              <span className="post-page__char-count">{caption.length}/120</span>
            </section>

            <button
              type="button"
              className={`post-page__btn post-page__btn--primary ${canPublish ? 'post-page__btn--ready' : ''}`}
              disabled={!canPublish}
              onClick={() => void handlePublish()}
            >
              {draft ? 'Share photo' : 'Add a photo to share'}
            </button>
            {publishError && (
              <p className="post-page__publish-error" role="alert">
                {publishError}
              </p>
            )}
          </div>
      </PageScroller>

      {photoAlert && (
        <AppOverlay>
          <button
            type="button"
            className="post-page__alert-backdrop"
            onClick={() => setPhotoAlert(null)}
            aria-label="Close"
          />
          <div className="post-page__alert-overlay">
            <div
              className="post-page__alert"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="post-photo-alert-title"
              aria-describedby="post-photo-alert-message"
            >
              <span className="post-page__alert-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="8.5" cy="10.5" r="1.5" />
                  <path d="M21 16l-5.5-5.5a1.5 1.5 0 00-2.12 0L3 18" />
                </svg>
              </span>
              <h2 id="post-photo-alert-title" className="post-page__alert-title">
                {photoAlert.title}
              </h2>
              <p id="post-photo-alert-message" className="post-page__alert-message">
                {photoAlert.message}
              </p>
              <button
                type="button"
                className="post-page__btn post-page__btn--primary post-page__alert-btn"
                onClick={() => setPhotoAlert(null)}
              >
                Try again
              </button>
            </div>
          </div>
        </AppOverlay>
      )}

      {showSuccess && (
        <AppOverlay>
          <button
            type="button"
            className="post-page__success-backdrop"
            onClick={handleSuccessDone}
            aria-label="Close"
          />
          <div className="post-page__success-overlay">
            <SheetSaveSuccess action="post" onComplete={handleSuccessDone} />
          </div>
        </AppOverlay>
      )}

      <PostCameraCapture
        open={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      <PostPhotoTemplatePicker
        open={pendingPhoto !== null}
        photoFile={pendingPhoto?.file ?? null}
        photoUrl={pendingPhoto?.url ?? null}
        onClose={closeTemplatePicker}
        onApply={handleTemplateApply}
      />
    </div>
  );
}
