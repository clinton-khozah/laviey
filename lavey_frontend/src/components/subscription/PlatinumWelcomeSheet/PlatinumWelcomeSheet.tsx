import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { PlatinumBadge } from '@/components/subscription/PlatinumBadge';
import '@/components/rooms/meetupTopSheet.css';
import './PlatinumWelcomeSheet.css';

interface PlatinumWelcomeSheetProps {
  open: boolean;
  onClose: () => void;
  primaryLabel?: string;
}

export function PlatinumWelcomeSheet({
  open,
  onClose,
  primaryLabel = 'Continue',
}: PlatinumWelcomeSheetProps) {
  return (
    <ProfileSheet
      open={open}
      title="Platinum"
      fromTop
      compact
      hideHandle
      onClose={onClose}
    >
      <div className="meetup-top-sheet platinum-welcome-sheet">
        <div className="platinum-welcome-sheet__hero">
          <PlatinumBadge size="md" showLabel />
          <p className="platinum-welcome-sheet__title">You&apos;re subscribed!</p>
          <p className="platinum-welcome-sheet__message">
            Welcome to Platinum — every perk is unlocked. Stand out, match faster, and see
            who&apos;s into you.
          </p>
        </div>

        <div className="platinum-welcome-sheet__actions">
          <button
            type="button"
            className="platinum-welcome-sheet__btn platinum-welcome-sheet__btn--primary"
            onClick={onClose}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </ProfileSheet>
  );
}
