import { useRef } from 'react';
import { FeedProfileAvatar } from '@/components/feed/FeedProfileAvatar';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { LAVEY_OFFICIAL_PROMO } from '@/constants/laveyOfficial';
import { hasCustomProfileAvatar } from '@/utils/discover/discoverProfileReady';
import type { Conversation } from '@/types';
import './ConversationListItem.css';

interface ConversationListItemProps {
  conversation: Conversation;
  onClick: () => void;
  onAvatarClick: () => void;
  onMoreClick?: () => void;
}

const LONG_PRESS_MS = 480;

function formatPreview(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('📷')) return 'Sent a photo';
  return trimmed;
}

function buildSubtitle(conversation: Conversation): string {
  if (conversation.conversationKind === 'notifications') {
    const preview = formatPreview(conversation.lastMessage);
    const time = conversation.lastMessageAt?.trim();
    if (preview && time) return `${preview} · ${time}`;
    return preview || 'Likes & crushes';
  }

  if (conversation.conversationKind === 'lavey_official') {
    const preview = formatPreview(conversation.lastMessage);
    const time = conversation.lastMessageAt?.trim();
    if (preview && time) return `${preview} · ${time}`;
    return preview || LAVEY_OFFICIAL_PROMO.preview;
  }

  if (
    conversation.conversationKind === 'i_crush_incoming' ||
    conversation.conversationKind === 'i_crush_outgoing'
  ) {
    const preview = formatPreview(conversation.lastMessage);
    const time = conversation.lastMessageAt?.trim();
    if (preview && time) return `${preview} · ${time}`;
    return preview || 'crushy';
  }

  if (conversation.isTyping) return 'Typing…';

  const preview = formatPreview(conversation.lastMessage);
  const time = conversation.lastMessageAt?.trim();

  if (preview && time) return `${preview} · ${time}`;
  if (preview) return preview;
  if (conversation.lastSeenLabel?.trim()) return conversation.lastSeenLabel.trim();
  if (time) return time;

  return '';
}

export function ConversationListItem({
  conversation,
  onClick,
  onAvatarClick,
  onMoreClick,
}: ConversationListItemProps) {
  const isNotifications = conversation.conversationKind === 'notifications';
  const isLaveyOfficial = conversation.conversationKind === 'lavey_official';
  const isICrush =
    conversation.conversationKind === 'i_crush_incoming' ||
    conversation.conversationKind === 'i_crush_outgoing';
  const hasUnread = conversation.unreadCount > 0;
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const avatarSrc = hasCustomProfileAvatar(conversation.participantAvatar)
    ? conversation.participantAvatar
    : undefined;

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleRowPointerDown = () => {
    if (!onMoreClick) return;
    longPressTriggered.current = false;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      onMoreClick();
    }, LONG_PRESS_MS);
  };

  const handleRowClick = () => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    onClick();
  };

  return (
    <div
      className={[
        'conversation-item',
        hasUnread ? 'conversation-item--unread' : '',
        conversation.isOnline ? 'conversation-item--online' : '',
        conversation.isPinned || isNotifications || isLaveyOfficial || isICrush ? 'conversation-item--starred' : '',
        isNotifications ? 'conversation-item--notifications' : '',
        isLaveyOfficial ? 'conversation-item--lavey' : '',
        isICrush ? 'conversation-item--icrush' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="conversation-item__avatar-btn"
        onClick={isNotifications || isLaveyOfficial ? onClick : onAvatarClick}
        aria-label={
          isNotifications
            ? 'Open notifications'
            : isLaveyOfficial
              ? 'Open message from Lavey'
              : `View ${conversation.participantName}'s profile`
        }
      >
        {isNotifications ? (
          <span className="conversation-item__notifications-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5-6.71V3a2 2 0 1 0-4 0v1.29A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2z" />
            </svg>
          </span>
        ) : isLaveyOfficial ? (
          <span className="conversation-item__lavey-icon" aria-hidden>
            <img src={LAVEY_OFFICIAL_PROMO.logoUrl} alt="" />
          </span>
        ) : (
          <FeedProfileAvatar
            name={conversation.participantName}
            src={avatarSrc}
            size="list"
            className="conversation-item__avatar"
          />
        )}
        {!isNotifications && !isLaveyOfficial && conversation.isOnline && (
          <span className="conversation-item__online" title="Active now" />
        )}
      </button>

      <button
        type="button"
        className="conversation-item__body"
        onClick={handleRowClick}
        onPointerDown={handleRowPointerDown}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
        onPointerCancel={clearLongPress}
        onContextMenu={(e) => {
          if (!onMoreClick) return;
          e.preventDefault();
          onMoreClick();
        }}
      >
        <span className="conversation-item__name-row">
          <span className="conversation-item__name">{conversation.participantName}</span>
          {isLaveyOfficial && (
            <VerifiedBadge size="sm" title="Verified official account" className="conversation-item__verified" />
          )}
          {!isNotifications && !isLaveyOfficial && !isICrush && conversation.isOnline && !conversation.isTyping && (
            <span className="conversation-item__online-label">Online</span>
          )}
          {isICrush && (
            <span className="conversation-item__icrush-tag" aria-label="crushy">
              💋
            </span>
          )}
          {(conversation.isPinned || isNotifications || isLaveyOfficial) && (
            <span className="conversation-item__pin" aria-label="Pinned">
              ★
            </span>
          )}
        </span>
        <span className="conversation-item__subtitle">{buildSubtitle(conversation)}</span>
      </button>
      {hasUnread && (
        <span className="conversation-item__badge" aria-label={`${conversation.unreadCount} unread`}>
          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
        </span>
      )}
    </div>
  );
}
