import type { Conversation } from '@/types';
import './ConversationListItem.css';

interface ConversationListItemProps {
  conversation: Conversation;
  onClick: () => void;
  onAvatarClick: () => void;
  onMoreClick?: () => void;
}

export function ConversationListItem({
  conversation,
  onClick,
  onAvatarClick,
  onMoreClick,
}: ConversationListItemProps) {
  const hasUnread = conversation.unreadCount > 0;

  return (
    <div
      className={`conversation-item ${hasUnread ? 'conversation-item--unread' : ''} ${conversation.isPinned ? 'conversation-item--starred' : ''}`}
    >
      <button
        type="button"
        className="conversation-item__avatar-wrap"
        onClick={onAvatarClick}
        aria-label={`View ${conversation.participantName}'s profile`}
      >
        <img src={conversation.participantAvatar} alt="" className="conversation-item__avatar" />
        {conversation.isOnline && <span className="conversation-item__online" title="Online" />}
        {conversation.isPinned && (
          <span className="conversation-item__star" aria-label="Starred">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </span>
        )}
      </button>

      <button type="button" className="conversation-item__body" onClick={onClick}>
        <div className="conversation-item__top">
          <div className="conversation-item__name-row">
            <span className="conversation-item__name">
              {conversation.participantName}
              {conversation.isPinned && (
                <span className="conversation-item__star-inline" aria-hidden>
                  ★
                </span>
              )}
            </span>
            <span className="conversation-item__vibe">{conversation.vibeScore}% vibe</span>
          </div>
          <span className="conversation-item__time">{conversation.lastMessageAt}</span>
        </div>

        <div className="conversation-item__bottom">
          {conversation.isTyping ? (
            <span className="conversation-item__typing">
              <span className="conversation-item__typing-dots">
                <span /><span /><span />
              </span>
              writing to you…
            </span>
          ) : (
            <p className="conversation-item__preview">{conversation.lastMessage}</p>
          )}
          {hasUnread && (
            <span className="conversation-item__badge">{conversation.unreadCount}</span>
          )}
        </div>
      </button>

      {onMoreClick && (
        <button
          type="button"
          className="conversation-item__more"
          onClick={(e) => {
            e.stopPropagation();
            onMoreClick();
          }}
          aria-label={`Options for chat with ${conversation.participantName}`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      )}
    </div>
  );
}
