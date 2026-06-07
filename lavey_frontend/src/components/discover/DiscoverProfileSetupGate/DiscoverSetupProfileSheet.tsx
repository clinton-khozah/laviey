import { useRef, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { LogoLoader } from '@/components/ui/LogoLoader';
import { contentService } from '@/services/content/contentService';
import { prepareImageForUpload } from '@/utils/media/prepareUploadMedia';
import { nsfwImageUserMessage } from '@/utils/media/nsfwImageCheck';
import { setStoredProfileAvatar } from '@/utils/profile/profileAvatarStorage';
import { hasCustomProfileAvatar } from '@/utils/discover/discoverProfileReady';
import type { UserProfile } from '@/types';
import './DiscoverSetupSheets.css';

type UploadStatus = 'idle' | 'uploading';

interface DiscoverSetupProfileSheetProps {
  open: boolean;
  profile: UserProfile;
  avatarPreview?: string;
  onClose: () => void;
  onAvatarUpdated: () => void | Promise<void>;
}

export function DiscoverSetupProfileSheet({
  open,
  profile,
  avatarPreview,
  onClose,
  onAvatarUpdated,
}: DiscoverSetupProfileSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  const uploadedAvatar =
    localAvatar ??
    (hasCustomProfileAvatar(avatarPreview) ? avatarPreview : undefined) ??
    (hasCustomProfileAvatar(profile.avatarUrl) ? profile.avatarUrl : undefined);

  const hasPhoto = Boolean(uploadedAvatar);
  const isBusy = uploadStatus !== 'idle';

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    void (async () => {
      setError(null);
      setUploadStatus('uploading');
      try {
        const prepared = await prepareImageForUpload(file);
        const url = await contentService.uploadAvatar(prepared);
        setStoredProfileAvatar(profile.id, url);
        setLocalAvatar(url);
        await onAvatarUpdated();
      } catch (err) {
        setError(nsfwImageUserMessage(err));
      } finally {
        setUploadStatus('idle');
      }
    })();
  };

  return (
    <ProfileSheet open={open} title="Your profile" onClose={onClose} edit hideHandle>
      <div className="discover-setup-sheet discover-setup-sheet--you">
        <p className="discover-setup-sheet__lead">
          Tap your photo to upload your profile picture.
        </p>

        <div className="discover-setup-sheet__you-hero">
          <button
            type="button"
            className="discover-setup-sheet__you-avatar-btn"
            onClick={() => inputRef.current?.click()}
            disabled={isBusy}
            aria-label="Upload profile photo"
            aria-busy={isBusy}
          >
            <span className="discover-setup-sheet__you-avatar-wrap">
              {hasPhoto ? (
                <span
                  className="discover-setup-sheet__you-avatar discover-setup-sheet__you-avatar--photo"
                  style={{ backgroundImage: `url("${uploadedAvatar}")` }}
                  role="img"
                  aria-label="Profile photo"
                />
              ) : (
                <span className="discover-setup-sheet__you-avatar discover-setup-sheet__you-avatar--icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
              )}
              {isBusy ? (
                <span className="discover-setup-sheet__avatar-loading" aria-hidden>
                  <LogoLoader size="sm" label="Uploading photo" />
                </span>
              ) : null}
            </span>
            {!isBusy ? <span className="discover-setup-sheet__you-edit">Edit</span> : null}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            tabIndex={-1}
            aria-hidden
            className="discover-setup-sheet__hidden-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) handleFile(file);
            }}
          />

          <button
            type="button"
            className="discover-setup-sheet__btn discover-setup-sheet__btn--upload"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
          >
            {hasPhoto ? 'Change photo' : 'Upload photo'}
          </button>

          <h3 className="discover-setup-sheet__you-name">{profile.displayName}</h3>
          {profile.bio ? (
            <p className="discover-setup-sheet__you-bio">{profile.bio}</p>
          ) : (
            <p className="discover-setup-sheet__you-bio discover-setup-sheet__you-bio--muted">
              Your bio from onboarding appears here
            </p>
          )}
        </div>

        {error ? <p className="discover-setup-sheet__error">{error}</p> : null}

        {hasPhoto && !isBusy ? (
          <button
            type="button"
            className="discover-setup-sheet__btn discover-setup-sheet__btn--secondary"
            onClick={onClose}
          >
            Done
          </button>
        ) : null}
      </div>
    </ProfileSheet>
  );
}
