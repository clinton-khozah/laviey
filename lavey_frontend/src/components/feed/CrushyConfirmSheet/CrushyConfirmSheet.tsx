import { ProfileSheet } from '@/components/profile/ProfileSheet';
import './CrushyConfirmSheet.css';

interface CrushyConfirmSheetProps {
  open: boolean;
  profileName: string;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function CrushyConfirmSheet({
  open,
  profileName,
  isSubmitting,
  onConfirm,
  onClose,
}: CrushyConfirmSheetProps) {
  const name = firstName(profileName);

  return (
    <ProfileSheet
      open={open}
      title="Send crushy?"
      compact
      hideHandle
      onClose={onClose}
    >
      <div className="crushy-confirm">
        <div className="crushy-confirm__hero">
          <div className="crushy-confirm__icon-wrap" aria-hidden>
            💋
          </div>
          <p className="crushy-confirm__message">
            You&apos;re about to send a crushy to <span className="crushy-confirm__name">{name}</span>.
            They&apos;ll get a notification and can accept or pass.
          </p>
        </div>

        <div className="crushy-confirm__actions">
          <button
            type="button"
            className="crushy-confirm__btn crushy-confirm__btn--cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Cancel
          </button>
          <button
            type="button"
            className="crushy-confirm__btn crushy-confirm__btn--confirm"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            <span aria-hidden>💋</span>
            {isSubmitting ? 'Sending…' : 'Okay'}
          </button>
        </div>
      </div>
    </ProfileSheet>
  );
}
