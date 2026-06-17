import { motion } from 'framer-motion';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { getDisplayableProfileDistance } from '@/utils/discover/discoverDistanceTiers';
import type { ProfileOverlayProps } from './ProfileOverlay.types';
import './ProfileOverlay.css';

export function ProfileOverlay({ profile }: ProfileOverlayProps) {
  const bio = profile.bio?.trim() ?? '';
  const distanceLabel = getDisplayableProfileDistance(profile);

  return (
    <motion.div
      className="profile-overlay"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
    >
      {profile.locationName ? (
        <div className="profile-overlay__location" aria-label={`Location: ${profile.locationName}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="profile-overlay__location-icon">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
          </svg>
          <span className="profile-overlay__location-text">{profile.locationName}</span>
        </div>
      ) : null}

      <div className="profile-overlay__bottom">
        <div className="profile-overlay__identity">
        <div className="profile-overlay__header">
          <h2 className="profile-overlay__name">
            {profile.name}
            {profile.verified && (
              <VerifiedBadge size="sm" className="profile-overlay__verified" />
            )}
            <span className="profile-overlay__age">, {profile.age}</span>
          </h2>
        </div>

        {bio ? <p className="profile-overlay__bio">{bio}</p> : null}
      </div>

      <div className="profile-overlay__meta">
        {distanceLabel ? (
          <span className="profile-overlay__distance">{distanceLabel}</span>
        ) : null}
        <span className="profile-overlay__vibe">{profile.vibeScore}% vibe match</span>
      </div>

      <div className="profile-overlay__tags">
        {profile.interests.map((tag) => {
          const label = tag.startsWith('#') ? tag.slice(1) : tag;
          return (
            <span key={tag} className="profile-overlay__tag">
              #{label}
            </span>
          );
        })}
      </div>
      </div>
    </motion.div>
  );
}
