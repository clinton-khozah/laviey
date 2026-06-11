import type { DateInvite } from '@/types';
import { hasMeetupCover, resolveMeetupCover } from '@/utils/meeting/meetupCover';
import './DateInviteCard.css';

interface DateInviteCardProps {
  invite: DateInvite;
  isBusy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function DateInviteCard({ invite, isBusy, onAccept, onDecline }: DateInviteCardProps) {
  const coverUrl = resolveMeetupCover(invite.coverImage);
  const showCover = hasMeetupCover(invite.coverImage);

  return (
    <article className="date-invite-card">
      {showCover ? (
        <div
          className="date-invite-card__thumb"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      ) : (
        <div className="date-invite-card__thumb date-invite-card__thumb--template">
          <span>#Private</span>
        </div>
      )}
      <div className="date-invite-card__main">
        <div className="date-invite-card__from">
          <img src={invite.fromAvatar} alt="" className="date-invite-card__avatar" />
          <div>
            <p className="date-invite-card__label">Invite from</p>
            <p className="date-invite-card__name">{invite.fromName}</p>
          </div>
        </div>
        <h3 className="date-invite-card__title">{invite.title}</h3>
        <p className="date-invite-card__topic">{invite.topic}</p>
        <p className="date-invite-card__when">{invite.scheduledLabel}</p>
        {invite.accessCode ? (
          <p className="date-invite-card__code">
            Your room code: <span>{invite.accessCode}</span>
          </p>
        ) : (
          <p className="date-invite-card__code date-invite-card__code--locked">
            Room code unlocks after you accept
          </p>
        )}
        <div className="date-invite-card__actions">
          <button
            type="button"
            className="date-invite-card__decline"
            onClick={onDecline}
            disabled={isBusy}
          >
            Decline
          </button>
          <button
            type="button"
            className="date-invite-card__accept"
            onClick={onAccept}
            disabled={isBusy}
          >
            {isBusy ? '…' : 'Accept meetup'}
          </button>
        </div>
      </div>
    </article>
  );
}
