import { motion } from 'framer-motion';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import type { ProfileOverlayProps } from './ProfileOverlay.types';
import './ProfileOverlay.css';

export function ProfileOverlay({ profile }: ProfileOverlayProps) {
  const bio = profile.bio?.trim() ?? '';

  return (
    <motion.div
      className="profile-overlay"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
    >
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
        <span className="profile-overlay__distance">{profile.distance}</span>
        <span className="profile-overlay__vibe">
          <span className="profile-overlay__vibe-dot" />
          {profile.vibeScore}% vibe match
        </span>
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
    </motion.div>
  );
}
