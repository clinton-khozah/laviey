import { useRef, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { ProfilePostsGrid } from '@/components/profile/ProfilePostsGrid';
import { LogoLoader } from '@/components/ui/LogoLoader';
import { MAX_PROFILE_POSTS, POST_LIMIT_MESSAGE } from '@/constants/profilePosts';
import { contentService } from '@/services/content/contentService';
import { prepareImageForUpload } from '@/utils/media/prepareUploadMedia';
import { nsfwImageUserMessage } from '@/utils/media/nsfwImageCheck';
import type { ProfilePost } from '@/types';
import './DiscoverSetupSheets.css';

interface DiscoverSetupGallerySheetProps {
  open: boolean;
  posts: ProfilePost[];
  userId?: string;
  avatarUrl?: string;
  onClose: () => void;
  onMomentAdded: () => void | Promise<void>;
}

export function DiscoverSetupGallerySheet({
  open,
  posts,
  onClose,
  onMomentAdded,
}: DiscoverSetupGallerySheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPosts, setLocalPosts] = useState<ProfilePost[]>(posts);

  const displayPosts = localPosts.length > 0 ? localPosts : posts;
  const hasMoments = displayPosts.length > 0;
  const atPostLimit = displayPosts.length >= MAX_PROFILE_POSTS;

  const saveMoment = (file: File) => {
    void (async () => {
      setError(null);
      if (atPostLimit) {
        setError(POST_LIMIT_MESSAGE);
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please choose a photo (images only).');
        return;
      }

      setIsSaving(true);
      try {
        const prepared = await prepareImageForUpload(file, undefined, { galleryUpload: true });
        const created = await contentService.createPost({ file: prepared });
        setLocalPosts((prev) => [created, ...prev]);
        await onMomentAdded();
      } catch (err) {
        setError(nsfwImageUserMessage(err));
      } finally {
        setIsSaving(false);
      }
    })();
  };

  return (
    <ProfileSheet open={open} title="Your profile gallery" onClose={onClose} compact>
      <div className="discover-setup-sheet discover-setup-sheet--posts">
        <p className="discover-setup-sheet__lead">
          Add up to {MAX_PROFILE_POSTS} clear photos for your match card.
        </p>

        {isSaving ? (
          <div className="discover-setup-sheet__loader" aria-live="polite">
            <LogoLoader size="md" label="Uploading photo" />
          </div>
        ) : null}

        <ProfilePostsGrid
          posts={displayPosts}
          postLimit={MAX_PROFILE_POSTS}
          limitItemLabel="photos"
          addAriaLabel="Add photo"
          addButtonLabel="Add"
          onAdd={atPostLimit || isSaving ? undefined : () => fileInputRef.current?.click()}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          tabIndex={-1}
          aria-hidden
          className="discover-setup-sheet__hidden-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) saveMoment(file);
          }}
        />

        {error && <p className="discover-setup-sheet__error">{error}</p>}

        <button
          type="button"
          className="discover-setup-sheet__btn"
          disabled={isSaving || atPostLimit}
          onClick={() => fileInputRef.current?.click()}
        >
          {isSaving ? 'Add photo' : atPostLimit ? 'Photo limit reached' : 'Add photo'}
        </button>

        {hasMoments && (
          <button
            type="button"
            className="discover-setup-sheet__btn discover-setup-sheet__btn--secondary"
            onClick={onClose}
          >
            Done
          </button>
        )}
      </div>
    </ProfileSheet>
  );
}
