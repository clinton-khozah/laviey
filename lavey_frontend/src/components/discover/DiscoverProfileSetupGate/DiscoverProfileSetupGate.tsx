import { useState } from 'react';
import { motion } from 'framer-motion';
import { AppOverlay } from '@/components/ui/AppOverlay';
import {
  hasAtLeastOnePost,
  hasCustomProfileAvatar,
} from '@/utils/discover/discoverProfileReady';
import type { UserProfile } from '@/types';
import { DiscoverSetupGallerySheet } from './DiscoverSetupPostSheet';
import { DiscoverSetupProfileSheet } from './DiscoverSetupProfileSheet';
import './DiscoverProfileSetupGate.css';

interface DiscoverProfileSetupGateProps {
  profile: UserProfile;
  presentation?: 'fullscreen' | 'overlay';
  avatarPreview?: string;
  onAvatarUpdated: () => void | Promise<void>;
  onMomentAdded: () => void | Promise<void>;
  canContinue: boolean;
  onSkip: () => void;
  onContinue: () => void;
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M17 14v7M14 17h7" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function DiscoverProfileSetupGate({
  profile,
  presentation = 'fullscreen',
  avatarPreview,
  onAvatarUpdated,
  onMomentAdded,
  canContinue,
  onSkip,
  onContinue,
}: DiscoverProfileSetupGateProps) {
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [gallerySheetOpen, setGallerySheetOpen] = useState(false);

  const hasAvatar = hasCustomProfileAvatar(avatarPreview ?? profile.avatarUrl);
  const hasMoments = hasAtLeastOnePost(profile.posts);
  const isOverlay = presentation === 'overlay';

  const setupContent = (
    <>
      {isOverlay ? (
        <p className="discover-setup-modal__eyebrow">
          <span className="discover-setup-modal__eyebrow-dot" aria-hidden />
          Get more matches
        </p>
      ) : (
        <p className="discover-setup__eyebrow">Get more matches</p>
      )}

      <h1
        id="discover-setup-title"
        className={isOverlay ? 'discover-setup-modal__title' : 'discover-setup__title'}
      >
        Set up your profile
      </h1>
      <p className={isOverlay ? 'discover-setup-modal__subtitle' : 'discover-setup__subtitle'}>
        {hasAvatar
          ? 'Add match-card photos — any picture works except inappropriate content.'
          : 'Upload a profile photo — members with photos get far more likes on For You.'}
      </p>

      <div className="discover-setup__cards">
        <button
          type="button"
          className={`discover-setup__action-card ${hasAvatar ? 'discover-setup__action-card--done' : ''}`}
          onClick={() => setProfileSheetOpen(true)}
        >
          <span className="discover-setup__icon-tile" aria-hidden>
            <ProfileIcon />
          </span>
          <span className="discover-setup__action-text">
            <span className="discover-setup__action-label">
              {hasAvatar ? 'Profile photo added' : 'Add profile photo'}
            </span>
            <span className="discover-setup__action-hint">Tap to upload your photo</span>
          </span>
          {hasAvatar ? (
            <span className="discover-setup__action-status discover-setup__action-status--done" aria-hidden>
              <CheckIcon />
            </span>
          ) : (
            <span className="discover-setup__action-chevron" aria-hidden>
              <ChevronIcon />
            </span>
          )}
        </button>

        {hasAvatar ? (
          <div className="discover-setup__gallery-block">
            <div className="discover-setup__steps-divider" aria-hidden>
              <span className="discover-setup__steps-divider-line" />
              <span className="discover-setup__steps-divider-label">Next step</span>
              <span className="discover-setup__steps-divider-line" />
            </div>
            <button
              type="button"
              className={`discover-setup__action-card ${hasMoments ? 'discover-setup__action-card--done' : ''}`}
              onClick={() => setGallerySheetOpen(true)}
            >
              <span className="discover-setup__icon-tile" aria-hidden>
                <GalleryIcon />
              </span>
              <span className="discover-setup__action-text">
                <span className="discover-setup__action-label">
                  {hasMoments ? 'Added to your card' : 'Add photos (up to 5)'}
                </span>
                <span className="discover-setup__action-hint">Any photo except inappropriate content</span>
              </span>
              {hasMoments ? (
                <span className="discover-setup__action-status discover-setup__action-status--done" aria-hidden>
                  <CheckIcon />
                </span>
              ) : (
                <span className="discover-setup__action-chevron" aria-hidden>
                  <ChevronIcon />
                </span>
              )}
            </button>
          </div>
        ) : null}
      </div>

      {canContinue ? (
        <button type="button" className="discover-setup__continue" onClick={onContinue}>
          Continue to For You
        </button>
      ) : null}
    </>
  );

  const sheets = (
    <>
      <DiscoverSetupProfileSheet
        open={profileSheetOpen}
        profile={profile}
        avatarPreview={avatarPreview}
        onClose={() => setProfileSheetOpen(false)}
        onAvatarUpdated={onAvatarUpdated}
      />

      <DiscoverSetupGallerySheet
        open={gallerySheetOpen}
        posts={profile.posts}
        userId={profile.id}
        avatarUrl={profile.avatarUrl}
        onClose={() => setGallerySheetOpen(false)}
        onMomentAdded={onMomentAdded}
      />
    </>
  );

  if (isOverlay) {
    return (
      <>
        <AppOverlay>
          <motion.button
            type="button"
            className="discover-setup-modal__backdrop"
            aria-label="Dismiss setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onSkip}
          />
          <div className="discover-setup-modal__center">
            <motion.div
              className="discover-setup-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="discover-setup-title"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <button
                type="button"
                className="discover-setup-modal__close"
                onClick={onSkip}
                aria-label="Close"
              >
                ×
              </button>
              <div className="discover-setup-modal__body">{setupContent}</div>
            </motion.div>
            <button type="button" className="discover-setup-modal__skip" onClick={onSkip}>
              Skip for now
            </button>
          </div>
        </AppOverlay>
        {sheets}
      </>
    );
  }

  return (
    <div
      className="discover-setup discover-setup--fullscreen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discover-setup-title"
    >
      <div className="discover-setup__bg" aria-hidden>
        <div className="discover-setup__blob discover-setup__blob--a" />
        <div className="discover-setup__blob discover-setup__blob--b" />
      </div>
      <div className="discover-setup__body">
        <div className="discover-setup__inner">{setupContent}</div>
      </div>
      <footer className="discover-setup__footer">
        <button type="button" className="discover-setup__skip" onClick={onSkip}>
          Skip for now
        </button>
      </footer>
      {sheets}
    </div>
  );
}
