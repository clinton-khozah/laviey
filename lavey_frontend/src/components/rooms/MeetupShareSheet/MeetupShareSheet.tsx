import { ProfileSheet } from '@/components/profile/ProfileSheet';
import type { OnlineDate } from '@/types';
import { buildMeetupJoinLink } from '@/utils/meeting/meetupJoinLink';
import './MeetupShareSheet.css';

interface MeetupShareSheetProps {
  open: boolean;
  date: OnlineDate | null;
  onClose: () => void;
  onCopyCode: (code: string) => void;
  onCopyLink: (link: string) => void;
}

export function MeetupShareSheet({
  open,
  date,
  onClose,
  onCopyCode,
  onCopyLink,
}: MeetupShareSheetProps) {
  if (!date) return null;

  const joinLink = date.joinLink ?? buildMeetupJoinLink(date.accessCode);
  const isPrivate = date.visibility === 'private';

  const handleShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: date.title,
        text: isPrivate
          ? `Join my private meetup on Lavey — use this link after accepting the invite`
          : `Join my meetup "${date.title}" on Lavey`,
        url: joinLink,
      });
    } catch {
      /* user cancelled or unsupported */
    }
  };

  return (
    <ProfileSheet
      open={open}
      title={isPrivate ? 'Invite sent' : 'Meetup created'}
      onClose={onClose}
      fromTop
      hideHandle
    >
      <div className="meetup-share-sheet">
        <p className="meetup-share-sheet__lead">
          {isPrivate
            ? `Your match will get the invite in-app. Share the room code with them after they accept.`
            : `Your meetup is live on the list — anyone can tap Join, no code needed.`}
        </p>

        {isPrivate ? (
          <>
            <div className="meetup-share-sheet__block">
              <span className="meetup-share-sheet__label">Room code</span>
              <div className="meetup-share-sheet__row">
                <span className="meetup-share-sheet__code">{date.accessCode}</span>
                <button
                  type="button"
                  className="meetup-share-sheet__copy"
                  onClick={() => onCopyCode(date.accessCode)}
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="meetup-share-sheet__block">
              <span className="meetup-share-sheet__label">Join link</span>
              <div className="meetup-share-sheet__row meetup-share-sheet__row--link">
                <span className="meetup-share-sheet__link">{joinLink}</span>
                <button
                  type="button"
                  className="meetup-share-sheet__copy"
                  onClick={() => onCopyLink(joinLink)}
                >
                  Copy
                </button>
              </div>
            </div>
          </>
        ) : null}

        <div className="meetup-share-sheet__actions">
          {isPrivate && typeof navigator.share === 'function' && (
            <button type="button" className="meetup-share-sheet__share" onClick={() => void handleShare()}>
              Share link
            </button>
          )}
          <button type="button" className="meetup-share-sheet__done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </ProfileSheet>
  );
}
