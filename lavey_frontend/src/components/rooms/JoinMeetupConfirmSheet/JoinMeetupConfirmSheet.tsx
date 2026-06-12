import { ProfileSheet } from '@/components/profile/ProfileSheet';
import type { OnlineDate } from '@/types';
import './JoinMeetupConfirmSheet.css';

interface JoinMeetupConfirmSheetProps {
  open: boolean;
  date: OnlineDate | null;
  isJoining?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function hostInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

export function JoinMeetupConfirmSheet({
  open,
  date,
  isJoining = false,
  onConfirm,
  onClose,
}: JoinMeetupConfirmSheetProps) {
  const hostLabel = date?.isHostedByYou ? 'you' : (date?.hostName ?? 'the host');

  return (
    <ProfileSheet
      open={open}
      title="Join meetup?"
      fromTop
      compact
      hideHandle
      onClose={onClose}
    >
      {date && (
        <div className="meetup-top-sheet join-meetup-confirm">
          <div className="join-meetup-confirm__main">
            {date.hostAvatar ? (
              <img src={date.hostAvatar} alt="" className="join-meetup-confirm__avatar" />
            ) : (
              <span className="join-meetup-confirm__avatar join-meetup-confirm__avatar--initial">
                {hostInitial(date.hostName)}
              </span>
            )}
            <p className="join-meetup-confirm__message">
              Join <span className="join-meetup-confirm__title">{date.title}</span> with{' '}
              <span className="join-meetup-confirm__host">{hostLabel}</span>?
            </p>
          </div>

          <div className="join-meetup-confirm__actions">
            <button
              type="button"
              className="join-meetup-confirm__btn join-meetup-confirm__btn--cancel"
              onClick={onClose}
              disabled={isJoining}
            >
              Cancel
            </button>
            <button
              type="button"
              className="join-meetup-confirm__btn join-meetup-confirm__btn--confirm"
              onClick={onConfirm}
              disabled={isJoining}
            >
              {isJoining ? 'Joining…' : 'Join meetup'}
            </button>
          </div>
        </div>
      )}
    </ProfileSheet>
  );
}
