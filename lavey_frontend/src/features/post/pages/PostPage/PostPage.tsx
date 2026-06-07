import { useCallback, useMemo, useRef, useState } from 'react';
import { PageScroller } from '@/components/layout/PageScroller';
import { useUserProfile } from '@/hooks';
import { MAX_PROFILE_POSTS, POST_LIMIT_MESSAGE } from '@/constants/profilePosts';
import { contentService } from '@/services/content/contentService';
import { prepareImageForUpload } from '@/utils/media/prepareUploadMedia';
import { nsfwImageUserMessage } from '@/utils/media/nsfwImageCheck';
import { LogoLoader } from '@/components/ui/LogoLoader';
import { PostCameraCapture } from './PostCameraCapture';
import { PostPhotoTemplatePicker } from './PostPhotoTemplatePicker';
import './PostPage.css';

type PostStep = 'compose' | 'success';

interface PhotoDraft {
  file: File;
  url: string;
}

interface PendingPhoto {
  file: File;
  url: string;
}

const QUICK_TAGS = ['Music', 'Coffee', 'Adventure', 'Fitness', 'Travel', 'Food', 'Sunset', 'NightOut'];

const FUN_TIPS = [
  { emoji: '📸', title: 'Show your world', text: 'Your coffee, your view, your fit — little moments win.' },
  { emoji: '🔥', title: 'Keep it you', text: 'Candid beats perfect. Authentic pics get more matches.' },
  { emoji: '💫', title: 'Mix it up', text: 'Post often — fresh pics keep you at the top of discover.' },
];

const CAPTION_PLACEHOLDERS = [
  "What's the vibe today?",
  'Coffee date energy ☕',
  'Feeling cute, might delete later',
  'Main character moment ✨',
  'This view though…',
];

export function PostPage() {
  const { profile, refetch } = useUserProfile();
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<PostStep>('compose');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [draft, setDraft] = useState<PhotoDraft | null>(null);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);

  const placeholder = useMemo(
    () => CAPTION_PLACEHOLDERS[Math.floor(Math.random() * CAPTION_PLACEHOLDERS.length)],
    [],
  );

  const clearDraft = useCallback(() => {
    if (draft?.url) URL.revokeObjectURL(draft.url);
    setDraft(null);
  }, [draft]);

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;

    setDraft((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
  }, []);

  const handleCameraCapture = useCallback((file: File) => {
    setIsCameraOpen(false);
    loadFile(file);
  }, [loadFile]);

  const openTemplatePicker = useCallback((file: File) => {
    setPendingPhoto({ file, url: URL.createObjectURL(file) });
    setIsCameraOpen(false);
  }, []);

  const closeTemplatePicker = useCallback(() => {
    setPendingPhoto((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  const handleTemplateApply = useCallback(
    (file: File) => {
      closeTemplatePicker();
      loadFile(file);
    },
    [closeTemplatePicker, loadFile],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openTemplatePicker(file);
    e.target.value = '';
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 4 ? [...prev, tag] : prev,
    );
  };

  const cycleTip = () => {
    setTipIndex((i) => (i + 1) % FUN_TIPS.length);
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
      const prepared = await prepareImageForUpload(draft.file);
      await contentService.createPost({
        file: prepared,
        caption: caption.trim() || undefined,
        tags,
      });
      await refetch();
      setStep('success');
    } catch (err) {
      const message = nsfwImageUserMessage(err);
      setPublishError(
        message.includes('POST_LIMIT') || message.includes('at most')
          ? POST_LIMIT_MESSAGE
          : message,
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCreateAnother = () => {
    clearDraft();
    setCaption('');
    setTags([]);
    setTipIndex(0);
    setStep('compose');
  };

  const canPublish = Boolean(draft) && !isPublishing;
  const activeTip = FUN_TIPS[tipIndex];
  const tagPool = (
    profile?.interests?.map((item) => item.label) ?? QUICK_TAGS
  ).slice(0, 8);

  return (
    <div className="post-page">
      <PageScroller className="post-page__scroll">
        <header className="post-page__header">
          <div className="post-page__header-glow" aria-hidden />
          <h1 className="post-page__title">Post a pic</h1>
          <p className="post-page__subtitle">Share a moment — photos only, all vibe</p>
        </header>

        {step === 'success' ? (
          <div className="post-page__success">
            <div className="post-page__success-burst" aria-hidden>
              <span>✨</span>
              <span>🔥</span>
              <span>💫</span>
              <span>📸</span>
            </div>
            <span className="post-page__success-icon" aria-hidden>
              🎉
            </span>
            <h2>Pic is live!</h2>
            <p>Your photo is on your profile and ready to spark new connections.</p>
            <button type="button" className="post-page__btn post-page__btn--primary" onClick={handleCreateAnother}>
              Post another ✨
            </button>
          </div>
        ) : (
          <div className="post-page__body">
            <button
              type="button"
              className={`post-page__preview ${draft ? 'post-page__preview--filled' : 'post-page__preview--empty'}`}
              onClick={() => !draft && galleryInputRef.current?.click()}
              aria-label={draft ? 'Photo preview' : 'Choose a photo'}
            >
              {!draft ? (
                <div className="post-page__preview-empty">
                  <span className="post-page__preview-orbit post-page__preview-orbit--outer" aria-hidden />
                  <span className="post-page__preview-orbit post-page__preview-orbit--inner" aria-hidden />
                  <span className="post-page__preview-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <circle cx="8.5" cy="10.5" r="1.75" />
                      <path d="M21 16l-5.5-5.5a1.5 1.5 0 00-2.12 0L3 18" />
                    </svg>
                  </span>
                  <p className="post-page__preview-label">Tap to add your pic</p>
                  <span className="post-page__preview-hint">Portrait · JPG or PNG</span>
                </div>
              ) : (
                <img className="post-page__preview-media" src={draft.url} alt="Your post preview" />
              )}

              {draft && (
                <button
                  type="button"
                  className="post-page__preview-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearDraft();
                  }}
                  aria-label="Remove photo"
                >
                  ×
                </button>
              )}

              {draft && (
                <span className="post-page__preview-badge" aria-hidden>
                  Looking good 🔥
                </span>
              )}

              {isPublishing && draft ? (
                <span className="post-page__preview-loading" aria-live="polite">
                  <LogoLoader size="md" label="Uploading photo" />
                </span>
              ) : null}
            </button>

            <div className="post-page__actions">
              <button
                type="button"
                className="post-page__action-card post-page__action-card--camera"
                onClick={() => setIsCameraOpen(true)}
              >
                <span className="post-page__action-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
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

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="post-page__file-input"
              onChange={handleFileChange}
              aria-hidden
              tabIndex={-1}
            />

            <section className="post-page__section">
              <label className="post-page__section-label" htmlFor="post-caption">
                Caption
                <span className="post-page__optional">optional</span>
              </label>
              <textarea
                id="post-caption"
                className="post-page__caption"
                placeholder={placeholder}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={120}
                rows={2}
              />
              <span className="post-page__char-count">{caption.length}/120</span>
            </section>

            <section className="post-page__section">
              <h2 className="post-page__section-label">
                Tags
                <span className="post-page__tag-count">{tags.length}/4</span>
              </h2>
              <p className="post-page__section-hint">Tap up to 4 — get discovered by the right people</p>
              <div className="post-page__tags">
                {tagPool.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`post-page__tag ${tags.includes(tag) ? 'post-page__tag--active' : ''}`}
                    onClick={() => toggleTag(tag)}
                    aria-pressed={tags.includes(tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </section>

            <button type="button" className="post-page__tips" onClick={cycleTip}>
              <span className="post-page__tips-emoji" aria-hidden>
                {activeTip.emoji}
              </span>
              <div className="post-page__tips-copy">
                <strong>{activeTip.title}</strong>
                <p>{activeTip.text}</p>
              </div>
              <span className="post-page__tips-next" aria-hidden>
                ↻
              </span>
            </button>

            <button
              type="button"
              className={`post-page__btn post-page__btn--primary ${canPublish ? 'post-page__btn--ready' : ''}`}
              disabled={!canPublish}
              onClick={() => void handlePublish()}
            >
              {draft ? 'Share it! 🔥' : 'Add a photo to share 📸'}
            </button>
            {publishError && (
              <p className="post-page__publish-error" role="alert">
                {publishError}
              </p>
            )}
          </div>
        )}
      </PageScroller>

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
