import { useState } from 'react';
import { MeetupCardMenuSheet } from '@/components/rooms/MeetupCardMenuSheet';
import { MeetupCardSocial } from '@/components/rooms/MeetupCardSocial';
import type { OnlineDate } from '@/types';
import { hasMeetupCover, resolveMeetupCover } from '@/utils/meeting/meetupCover';
import { meetupRequiresAccessCode } from '@/utils/meeting/meetupJoinAccess';
import { buildMeetupJoinLink } from '@/utils/meeting/meetupJoinLink';
import './OnlineDateCard.css';

interface OnlineDateCardProps {
  date: OnlineDate;
  layout?: 'stack' | 'feed';
  isJoining: boolean;
  isDeleting?: boolean;
  onJoin: () => void;
  onCopyCode: (code: string) => void;
  onCopyLink: (link: string) => void;
  onEdit?: (date: OnlineDate) => void;
  onDelete?: (date: OnlineDate) => void;
  onHostClick?: (date: OnlineDate) => void;
  onProfileClick?: (userId: string) => void;
}

function statusLabel(date: OnlineDate): string {
  if (date.status === 'live') return 'Live now';
  if (date.scheduledLabel) return date.scheduledLabel;
  if (date.status === 'starting-soon' && date.startsInMinutes != null) {
    return `Starts in ${date.startsInMinutes}m`;
  }
  if (date.startsInMinutes != null) return `In ${date.startsInMinutes}m`;
  return 'Scheduled';
}

function hostInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

export function OnlineDateCard({
  date,
  layout = 'stack',
  isJoining,
  isDeleting = false,
  onJoin,
  onCopyCode,
  onCopyLink,
  onEdit,
  onDelete,
  onHostClick,
  onProfileClick,
}: OnlineDateCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isLive = date.status === 'live';
  const joinLink = date.joinLink ?? buildMeetupJoinLink(date.accessCode);
  const hostDisplayName = date.isHostedByYou ? 'You' : date.hostName;
  const showAccessCode = meetupRequiresAccessCode(date);
  const joinLabel = isLive ? 'Join' : showAccessCode ? 'Join' : 'Join';
  const coverUrl = resolveMeetupCover(date.coverImage);
  const showCover = hasMeetupCover(date.coverImage);
  const hostAvatarUrl = date.hostAvatar?.trim() || undefined;
  const showProfileCover = !showCover && Boolean(hostAvatarUrl);
  const isBusy = isJoining || isDeleting;

  const mediaImage = showCover
    ? `url(${coverUrl})`
    : showProfileCover
      ? `url(${hostAvatarUrl})`
      : undefined;

  const mediaStyle = mediaImage ? { backgroundImage: mediaImage } : undefined;

  const mediaClassName = [
    'online-date-card__media',
    showProfileCover ? 'online-date-card__media--profile' : '',
    !showCover && !showProfileCover ? 'online-date-card__media--empty' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const isFeed = layout === 'feed';

  const handleViewHost = () => {
    if (onHostClick) {
      onHostClick(date);
      return;
    }
    if (date.hostUserId && onProfileClick) {
      onProfileClick(date.hostUserId);
    }
  };

  return (
    <>
      <article
        className={`online-date-card ${isLive ? 'online-date-card--live' : ''} ${isFeed ? 'online-date-card--feed' : ''}`}
      >
        <div className="online-date-card__stage">
          <div className={mediaClassName} style={mediaStyle} />
          {isLive ? <div className="online-date-card__live-glow" aria-hidden /> : null}

          <div className="online-date-card__gradient online-date-card__gradient--vignette" />

          <div className="online-date-card__chrome">
            <div className="online-date-card__top">
              <button
                type="button"
                className="online-date-card__host-chip"
                onClick={() => {
                  if (onHostClick) {
                    onHostClick(date);
                    return;
                  }
                  if (date.hostUserId && onProfileClick) {
                    onProfileClick(date.hostUserId);
                  }
                }}
                disabled={!onHostClick && !onProfileClick}
              >
                {hostAvatarUrl ? (
                  <img src={hostAvatarUrl} alt="" className="online-date-card__host-chip-avatar" />
                ) : (
                  <span className="online-date-card__host-chip-avatar online-date-card__host-chip-avatar--initial">
                    {hostInitial(date.hostName)}
                  </span>
                )}
                <span className="online-date-card__host-chip-text">
                  <span className="online-date-card__host-chip-name">{hostDisplayName}</span>
                  <span className="online-date-card__host-chip-meta">
                    {date.visibility === 'public' ? 'Public' : 'Private'}
                  </span>
                </span>
              </button>

              <div className="online-date-card__top-end">
                <div className="online-date-card__top-badges">
                  {isLive ? (
                    <span className="online-date-card__live-pill">
                      <span className="online-date-card__pulse" aria-hidden />
                      Live
                    </span>
                  ) : (
                    <span className="online-date-card__status-pill">{statusLabel(date)}</span>
                  )}
                  <div
                    className="online-date-card__active"
                    aria-label={`${date.participantCount} of ${date.maxParticipants} active`}
                  >
                    <span className="online-date-card__active-label">Active</span>
                    <span className="online-date-card__active-count">
                      {date.participantCount} of {date.maxParticipants}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="online-date-card__menu-btn"
                  onClick={() => setMenuOpen(true)}
                  disabled={isBusy}
                  aria-label="Meetup options"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <circle cx="5" cy="12" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="19" cy="12" r="1.8" />
                  </svg>
                </button>
              </div>
            </div>

            <MeetupCardSocial
              variant="rail"
              meetupId={date.id}
              onJoin={onJoin}
              isJoining={isBusy}
              joinLabel={joinLabel}
              showHostAvatar={false}
              onProfileClick={onProfileClick}
            />
          </div>
        </div>

        {showAccessCode ? (
          <div className="online-date-card__access">
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
          </div>
        ) : null}
      </article>

      <MeetupCardMenuSheet
        open={menuOpen}
        date={date}
        onClose={() => setMenuOpen(false)}
        onEdit={date.isHostedByYou ? onEdit : undefined}
        onDelete={date.isHostedByYou ? onDelete : undefined}
        onJoin={!date.isHostedByYou ? onJoin : undefined}
        onViewHost={
          !date.isHostedByYou && (onHostClick || (date.hostUserId && onProfileClick))
            ? handleViewHost
            : undefined
        }
        onCopyCode={onCopyCode}
        onCopyLink={onCopyLink}
      />
    </>
  );
}
