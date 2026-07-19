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
  onMoreOptions,
  onPaidChat,
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
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'tween', duration: 0.12 }}
        aria-label={isMutual ? 'Matched' : liked ? 'Like sent' : 'Send like'}
        aria-pressed={liked}
      >
        <motion.svg
          viewBox="0 0 24 24"
          aria-hidden
          className="action-rail__heart-icon"
          animate={liked ? { scale: [1, 1.32, 1] } : { scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <path
            className="action-rail__heart-shape"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </motion.svg>
        <span className={`action-rail__label ${isMutual ? 'action-rail__label--matched' : ''}`}>
          {likeLabel}
        </span>
      </motion.button>

      <motion.button
        type="button"
        className={`action-rail__btn action-rail__btn--crushy ${iCrushSent ? 'action-rail__btn--crushy-active' : ''} ${crushyConfirmOpen ? 'action-rail__btn--crushy-pending' : ''}`}
        onClick={handleCrushyClick}
        whileTap={iCrushSent ? undefined : { scale: 0.92 }}
        transition={{ type: 'tween', duration: 0.12 }}
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

      {onPaidChat ? (
        <motion.button
          type="button"
          className="action-rail__btn action-rail__btn--paid-chat"
          onClick={onPaidChat}
          whileTap={{ scale: 0.9 }}
          aria-label={`Chat with ${profile.name}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            <path d="M8 9h8M8 13h5" />
          </svg>
          <span className="action-rail__label">Chat now</span>
        </motion.button>
      ) : null}

      <button
        type="button"
        className="action-rail__btn action-rail__btn--more"
        aria-label="More options"
        onClick={onMoreOptions}
      >
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
