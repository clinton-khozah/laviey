import { ProfileSheet } from '@/components/profile/ProfileSheet';
import type { OnlineDate } from '@/types';
import './DeleteMeetupConfirmSheet.css';

interface DeleteMeetupConfirmSheetProps {
  open: boolean;
  date: OnlineDate | null;
  isDeleting?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteMeetupConfirmSheet({
  open,
  date,
  isDeleting = false,
  error,
  onConfirm,
  onClose,
}: DeleteMeetupConfirmSheetProps) {
  return (
    <ProfileSheet open={open} title="Delete meetup?" compact hideHandle onClose={onClose}>
      {date && (
        <div className="delete-meetup-confirm">
          <p className="delete-meetup-confirm__message">
            Delete <span className="delete-meetup-confirm__title">&ldquo;{date.title}&rdquo;</span>?
            This cannot be undone.
          </p>

          {error ? (
            <p className="delete-meetup-confirm__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="delete-meetup-confirm__actions">
            <button
              type="button"
              className="delete-meetup-confirm__btn delete-meetup-confirm__btn--cancel"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="delete-meetup-confirm__btn delete-meetup-confirm__btn--delete"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete meetup'}
            </button>
          </div>
        </div>
      )}
    </ProfileSheet>
  );
}
