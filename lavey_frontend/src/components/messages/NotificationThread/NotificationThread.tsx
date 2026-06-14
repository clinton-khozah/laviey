import { useEffect } from 'react';
import { ProfileInitialAvatar } from '@/components/ui/ProfileInitialAvatar';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { PageScroller } from '@/components/layout/PageScroller';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { FeedState } from '@/components/ui/FeedState';
import type { NotificationEvent } from '@/types';
import { isActionableNotification, notificationKindLabel } from '@/types/domain/notification.types';
import { hasFeedDisplayMedia } from '@/utils/profile/feedMedia';
import './NotificationThread.css';

interface NotificationThreadProps {
  notifications: NotificationEvent[];
  isLoading: boolean;
  error: string | null;
  likedProfileIds: Set<string>;
  onBack: () => void;
  onLikeBack: (profileId: string) => void;
  onChat: (profileId: string) => void;
  onMarkRead: () => void;
  onRetry: () => void;
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function NotificationAvatar({ item }: { item: NotificationEvent }) {
  if (item.kind === 'verified') {
    return (
      <span className="notification-thread__icon notification-thread__icon--verified" aria-hidden>
        <VerifiedBadge size="lg" ring />
      </span>
    );
  }

  if (item.kind === 'system') {
    return (
      <span className="notification-thread__icon notification-thread__icon--system" aria-hidden>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5-6.71V3a2 2 0 1 0-4 0v1.29A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2z" />
        </svg>
      </span>
    );
  }

  const avatarSrc = hasFeedDisplayMedia(item.actorAvatar) ? item.actorAvatar : undefined;
  return (
    <ProfileInitialAvatar
      name={item.actorName}
      src={avatarSrc}
      className="notification-thread__avatar"
      size="md"
    />
  );
}

export function NotificationThread({
  notifications,
  isLoading,
  error,
  likedProfileIds,
  onBack,
  onLikeBack,
  onChat,
  onMarkRead,
  onRetry,
}: NotificationThreadProps) {
  useEffect(() => {
    onMarkRead();
  }, [onMarkRead]);

  const handleAction = (item: NotificationEvent) => {
    if (item.kind === 'meetup_like' || item.kind === 'meetup_join') {
      window.dispatchEvent(new CustomEvent('lavey:navigate', { detail: { nav: 'rooms' } }));
      onBack();
      return;
    }
    if (!item.actorUserId) return;
    if (item.kind === 'match' || likedProfileIds.has(item.actorUserId)) {
      onChat(item.actorUserId);
      return;
    }
    onLikeBack(item.actorUserId);
  };

  return (
    <AppOverlay>
      <div className="notification-thread">
      <header className="notification-thread__header">
        <button type="button" className="notification-thread__back" onClick={onBack} aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="notification-thread__title-wrap">
          <span className="notification-thread__bell" aria-hidden>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5-6.71V3a2 2 0 1 0-4 0v1.29A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2z" />
            </svg>
          </span>
          <div>
            <h1 className="notification-thread__title">Notifications</h1>
            <p className="notification-thread__subtitle">Auto-clear after 24 hours</p>
          </div>
        </div>
      </header>

      <PageScroller className="notification-thread__scroll">
        {isLoading && <PageTransitionSplash />}
        {error && <FeedState message={error} onRetry={onRetry} />}

        {!isLoading && !error && notifications.length === 0 && (
          <div className="notification-thread__empty">
            <span className="notification-thread__empty-icon" aria-hidden>🔔</span>
            <p>Nothing new right now</p>
            <span>Likes, crushes, and updates show up here for 24 hours.</span>
          </div>
        )}

        {!isLoading && !error && notifications.length > 0 && (
          <ul className="notification-thread__list">
            {notifications.map((item) => {
              const matched = item.actorUserId ? likedProfileIds.has(item.actorUserId) : false;
              const actionable = isActionableNotification(item);
              const showChat = item.kind === 'match' || matched;
              const headline =
                item.title ??
                (item.kind === 'verified'
                  ? "You're verified!"
                  : item.text);
              return (
                <li
                  key={item.id}
                  className={[
                    'notification-thread__card',
                    `notification-thread__card--${item.kind}`,
                    item.read ? '' : 'notification-thread__card--unread',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <NotificationAvatar item={item} />
                  <div className="notification-thread__content">
                    <p className="notification-thread__card-title">{headline}</p>
                    {item.body && item.body !== headline ? (
                      <p className="notification-thread__text">{item.body}</p>
                    ) : item.kind !== 'verified' && item.title && item.text !== item.title ? (
                      <p className="notification-thread__text">{item.text}</p>
                    ) : null}
                    <span className="notification-thread__meta">
                      {notificationKindLabel(item.kind)} · {item.sentAt}
                    </span>
                  </div>
                  {actionable ? (
                    <button
                      type="button"
                      className={`notification-thread__action ${
                        showChat ? 'notification-thread__action--chat' : ''
                      }`}
                      onClick={() => handleAction(item)}
                    >
                      {showChat ? (
                        'Chat'
                      ) : (
                        <>
                          <HeartIcon />
                          Like back
                        </>
                      )}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </PageScroller>
      </div>
    </AppOverlay>
  );
}
