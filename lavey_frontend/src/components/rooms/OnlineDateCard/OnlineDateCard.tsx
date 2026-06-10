import type { OnlineDate } from '@/types';
import { buildMeetupJoinLink } from '@/utils/meeting/meetupJoinLink';
import './OnlineDateCard.css';

interface OnlineDateCardProps {
  date: OnlineDate;
  isJoining: boolean;
  onJoin: () => void;
  onCopyCode: (code: string) => void;
  onCopyLink: (link: string) => void;
}

function statusLabel(date: OnlineDate): string {
  if (date.status === 'live') return 'Live now';
  if (date.status === 'starting-soon') return `Starts in ${date.startsInMinutes}m`;
  return `In ${date.startsInMinutes}m`;
}

export function OnlineDateCard({ date, isJoining, onJoin, onCopyCode, onCopyLink }: OnlineDateCardProps) {
  const isLive = date.status === 'live';
  const fillPct = Math.min(100, (date.participantCount / date.maxParticipants) * 100);
  const joinLink = date.joinLink ?? buildMeetupJoinLink(date.accessCode);

  return (
    <article className={`online-date-card ${isLive ? 'online-date-card--live' : ''}`}>
      <div
        className="online-date-card__cover"
        style={{ backgroundImage: `url(${date.coverImage})` }}
      >
        <div className="online-date-card__badges">
          <span className={`online-date-card__status online-date-card__status--${date.status}`}>
            {isLive && <span className="online-date-card__pulse" aria-hidden />}
            {statusLabel(date)}
          </span>
          <span
            className={`online-date-card__visibility online-date-card__visibility--${date.visibility}`}
          >
            {date.visibility === 'public' ? 'Public' : 'Private'}
          </span>
        </div>
        <span className="online-date-card__count">
          {date.participantCount}/{date.maxParticipants}
        </span>
        <div className="online-date-card__fill" aria-hidden>
          <span style={{ width: `${fillPct}%` }} />
        </div>
      </div>

      <div className="online-date-card__body">
        <h3 className="online-date-card__title">{date.title}</h3>
        <p className="online-date-card__topic">{date.topic}</p>

        <div className="online-date-card__host">
          {date.hostAvatar ? (
            <img src={date.hostAvatar} alt="" className="online-date-card__host-avatar" />
          ) : (
            <span className="online-date-card__host-avatar online-date-card__host-avatar--you">
              You
            </span>
          )}
          <span>
            {date.isHostedByYou ? 'Hosted by you' : `Hosted by ${date.hostName}`}
          </span>
        </div>

        <div className="online-date-card__tags">
          {date.tags.map((tag) => (
            <span key={tag} className="online-date-card__tag">
              #{tag}
            </span>
          ))}
        </div>

        <div className="online-date-card__code-row">
          <div className="online-date-card__code">
            <span className="online-date-card__code-label">Room code</span>
            <span className="online-date-card__code-value">{date.accessCode}</span>
          </div>
          <button
            type="button"
            className="online-date-card__copy"
            onClick={() => onCopyCode(date.accessCode)}
            aria-label="Copy room code"
          >
            Copy
          </button>
        </div>

        <div className="online-date-card__link-row">
          <div className="online-date-card__link">
            <span className="online-date-card__code-label">Join link</span>
            <span className="online-date-card__link-value">{joinLink}</span>
          </div>
          <button
            type="button"
            className="online-date-card__copy"
            onClick={() => onCopyLink(joinLink)}
            aria-label="Copy join link"
          >
            Copy
          </button>
        </div>

        <button
          type="button"
          className="online-date-card__join"
          onClick={onJoin}
          disabled={isJoining}
        >
          {isJoining ? 'Connecting…' : isLive ? 'Join meetup' : 'Reserve & get code'}
        </button>
      </div>
    </article>
  );
}
