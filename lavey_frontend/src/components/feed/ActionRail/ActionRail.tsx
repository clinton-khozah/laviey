import { useState } from 'react';
import { motion } from 'framer-motion';
import { FeedProfileAvatar } from '@/components/feed/FeedProfileAvatar';
import { CrushyConfirmSheet } from '@/components/feed/CrushyConfirmSheet';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { CrushyKissIcon } from '@/components/feed/ActionRail/CrushyKissIcon';
import { getLikeButtonLabel } from '@/utils/likeButtonLabel';
import { hasCustomProfileAvatar } from '@/utils/discover/discoverProfileReady';
import type { ActionRailProps } from './ActionRail.types';
import './ActionRail.css';

export function ActionRail({
  profile,
  liked,
  iCrushSent,
  onLike,
  onICrush,
  onProfileClick,
}: ActionRailProps) {
  const [crushyConfirmOpen, setCrushyConfirmOpen] = useState(false);
  const isMutual = liked && profile.likedYou;
  const likeLabel = getLikeButtonLabel(liked, profile.likedYou);
  const avatarSrc = hasCustomProfileAvatar(profile.avatar) ? profile.avatar : undefined;

  const handleCrushyClick = () => {
    if (iCrushSent) return;
    setCrushyConfirmOpen(true);
  };

  const handleCrushyConfirm = () => {
    setCrushyConfirmOpen(false);
    onICrush();
  };

  return (
    <>
    <aside className="action-rail" aria-label="Profile actions">
      <button
        type="button"
        className="action-rail__avatar-btn"
        onClick={onProfileClick}
        aria-label={`View ${profile.name}'s profile`}
      >
        <FeedProfileAvatar
          name={profile.name}
          src={avatarSrc}
          className="action-rail__avatar"
          size="sm"
        />
        {profile.verified && (
          <VerifiedBadge
            size="sm"
            ring
            className="action-rail__verified"
            title="Verified"
          />
        )}
        {profile.likedYou && !liked && (
          <span className="action-rail__liked-you" title="Liked you">
            🔥
          </span>
        )}
      </button>

      <motion.button
        type="button"
        className={`action-rail__btn action-rail__btn--flame ${liked ? 'action-rail__btn--flame-active' : ''} ${isMutual ? 'action-rail__btn--mutual' : ''}`}
        onClick={onLike}
        whileTap={{ scale: 0.88 }}
        aria-label={isMutual ? 'Matched' : liked ? 'Like sent' : 'Send like'}
        aria-pressed={liked}
      >
        <svg viewBox="0 0 24 24" aria-hidden className="action-rail__heart-icon">
          <path
            className="action-rail__heart-shape"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
        <span className={`action-rail__label ${isMutual ? 'action-rail__label--matched' : ''}`}>
          {likeLabel}
        </span>
      </motion.button>

      <motion.button
        type="button"
        className={`action-rail__btn action-rail__btn--crushy ${iCrushSent ? 'action-rail__btn--crushy-active' : ''} ${crushyConfirmOpen ? 'action-rail__btn--crushy-pending' : ''}`}
        onClick={handleCrushyClick}
        whileTap={iCrushSent ? undefined : { scale: 0.9 }}
        aria-label={iCrushSent ? 'Crushy sent' : 'Send crushy'}
        aria-pressed={iCrushSent}
        disabled={iCrushSent}
      >
        <CrushyKissIcon
          active={iCrushSent}
          pending={crushyConfirmOpen && !iCrushSent}
        />
        <span className={`action-rail__label ${iCrushSent ? 'action-rail__label--crushy-sent' : ''}`}>
          {iCrushSent ? 'Sent' : 'crushy'}
        </span>
      </motion.button>

      <button type="button" className="action-rail__btn action-rail__btn--more" aria-label="More options">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
    </aside>

    <CrushyConfirmSheet
      open={crushyConfirmOpen}
      profileName={profile.name}
      onClose={() => setCrushyConfirmOpen(false)}
      onConfirm={handleCrushyConfirm}
    />
    </>
  );
}
