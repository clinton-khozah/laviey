import { useEffect, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { ProfileMenuItem } from '@/components/profile/ProfileMenuItem';
import { useAnchorPosition } from '@/hooks/ui/useAnchorPosition';
import type { UserProfile } from '@/types';
import './ProfileMenuSheet.css';

export type ProfileMenuAction =
  | 'edit'
  | 'photos'
  | 'platinum'
  | 'safety'
  | 'settings'
  | 'earnings'
  | 'support'
  | 'guidelines'
  | 'terms'
  | 'signout';

interface ProfileMenuSheetProps {
  open: boolean;
  profile: UserProfile;
  photoCount?: number;
  isSubmitting?: boolean;
  anchorRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSelect: (action: ProfileMenuAction) => void;
}

export function ProfileMenuSheet({
  open,
  profile,
  photoCount = 0,
  isSubmitting,
  anchorRef,
  onClose,
  onSelect,
}: ProfileMenuSheetProps) {
  const anchorPos = useAnchorPosition(open, anchorRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const pick = (action: ProfileMenuAction) => {
    onSelect(action);
    onClose();
  };

  if (!open) return null;

  return (
    <AppOverlay>
      <button
        type="button"
        className="profile-menu-popover__backdrop"
        aria-label="Close menu"
        onClick={onClose}
      />
      <motion.div
        className="profile-menu-popover"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-menu-title"
        initial={{ opacity: 0, scale: 0.94, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -4 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        style={{
          transformOrigin: 'top right',
          top: anchorPos?.top ?? 'calc(var(--safe-top) + 44px)',
          right: anchorPos?.right ?? 16,
        }}
      >
        <header className="profile-menu-popover__header">
          <h2 id="profile-menu-title" className="profile-menu-popover__title">
            Menu
          </h2>
          <button
            type="button"
            className="profile-menu-popover__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <nav className="profile-menu-popover__nav" aria-label="Profile menu">
          <div className="profile-menu-popover__group">
            <ProfileMenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              }
              label="Edit profile"
              description="Name, bio, photos & interests"
              onClick={() => pick('edit')}
            />
            <ProfileMenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="8.5" cy="11" r="1.5" fill="currentColor" stroke="none" />
                  <path d="M21 15l-5-5L5 19" />
                </svg>
              }
              label="My photos"
              description="Up to 5 photos on your profile"
              badge={photoCount > 0 ? `${photoCount}/5` : undefined}
              onClick={() => pick('photos')}
            />
          </div>

          <div className="profile-menu-popover__divider" aria-hidden />

          <div className="profile-menu-popover__group">
            {!profile.isPremium ? (
              <ProfileMenuItem
                icon={
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
                  </svg>
                }
                label="Upgrade to Platinum"
                description="Unlimited flames, AI review & spotlight"
                variant="premium"
                onClick={() => pick('platinum')}
              />
            ) : null}
            <ProfileMenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              }
              label="Safety & privacy"
              description="Block, report & visibility"
              onClick={() => pick('safety')}
            />
            <ProfileMenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              }
              label="Settings"
              description="Notifications, account & preferences"
              onClick={() => pick('settings')}
            />
            <ProfileMenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              }
              label="My gifts"
              value={`$${profile.stats.giftEarnings.toFixed(2)}`}
              description="From gifts and admin credits"
              variant="earnings"
              onClick={() => pick('earnings')}
            />
          </div>

          <div className="profile-menu-popover__divider" aria-hidden />

          <div className="profile-menu-popover__group">
            <p className="profile-menu-popover__group-label">Help &amp; trust</p>
            <ProfileMenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              }
              label="Contact support"
              description="Chat with our team — we reply fast"
              onClick={() => pick('support')}
            />
            <ProfileMenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              }
              label="Community guidelines"
              description="How we keep Lavey respectful & safe"
              onClick={() => pick('guidelines')}
            />
            <ProfileMenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
              }
              label="Terms of service"
              description="Your rights, privacy & how Lavey works"
              onClick={() => pick('terms')}
            />
          </div>

          <div className="profile-menu-popover__divider" aria-hidden />

          <div className="profile-menu-popover__group profile-menu-popover__group--footer">
            <ProfileMenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              }
              label="Sign out"
              description="Log out of this device"
              variant="danger"
              onClick={() => pick('signout')}
              disabled={isSubmitting}
            />
          </div>
        </nav>
      </motion.div>
    </AppOverlay>
  );
}
