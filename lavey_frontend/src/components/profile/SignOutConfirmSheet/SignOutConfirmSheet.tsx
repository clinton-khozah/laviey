import { ProfileSheet } from '@/components/profile/ProfileSheet';
import './SignOutConfirmSheet.css';

interface SignOutConfirmSheetProps {
  open: boolean;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function SignOutConfirmSheet({
  open,
  isSubmitting,
  onConfirm,
  onClose,
}: SignOutConfirmSheetProps) {
  return (
    <ProfileSheet
      open={open}
      title="Sign out?"
      fromTop
      compact
      hideHandle
      onClose={onClose}
    >
      <div className="sign-out-confirm">
        <div className="sign-out-confirm__hero">
          <div className="sign-out-confirm__icon-wrap" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </div>
          <p className="sign-out-confirm__message">
            You&apos;ll need to sign in again to access your matches and messages.
          </p>
        </div>

        <div className="sign-out-confirm__actions">
          <button
            type="button"
            className="sign-out-confirm__btn sign-out-confirm__btn--cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            No, stay
          </button>
          <button
            type="button"
            className="sign-out-confirm__btn sign-out-confirm__btn--confirm"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            {isSubmitting ? 'Signing out…' : 'Yes, sign out'}
          </button>
        </div>
      </div>
    </ProfileSheet>
  );
}
