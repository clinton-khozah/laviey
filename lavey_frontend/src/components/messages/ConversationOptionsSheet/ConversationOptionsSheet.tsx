import { ProfileSheet } from '@/components/profile/ProfileSheet';
import type { Conversation } from '@/types';
import './ConversationOptionsSheet.css';

interface ConversationOptionsSheetProps {
  open: boolean;
  conversation: Conversation | null;
  onClose: () => void;
  onToggleStar: () => void;
  onDeleteChat: () => void;
}

export function ConversationOptionsSheet({
  open,
  conversation,
  onClose,
  onToggleStar,
  onDeleteChat,
}: ConversationOptionsSheetProps) {
  if (!conversation) return null;

  const isStarred = conversation.isPinned;

  return (
    <ProfileSheet open={open} title={conversation.participantName} onClose={onClose} hideHandle>
      <div className="conversation-options-sheet">
        <div className="conversation-options-sheet__intro">
          <img src={conversation.participantAvatar} alt="" />
          <span>{conversation.vibeScore}% vibe match</span>
        </div>

        <button type="button" className="conversation-options-sheet__action" onClick={onToggleStar}>
          <span className="conversation-options-sheet__icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill={isStarred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </span>
          <span className="conversation-options-sheet__text">
            <strong>{isStarred ? 'Unstar' : 'Star'}</strong>
            <span>
              {isStarred
                ? 'Remove from prioritized chats'
                : 'Keep this chat at the top of your inbox'}
            </span>
          </span>
        </button>

        <button
          type="button"
          className="conversation-options-sheet__action conversation-options-sheet__action--danger"
          onClick={onDeleteChat}
        >
          <span className="conversation-options-sheet__icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
            </svg>
          </span>
          <span className="conversation-options-sheet__text">
            <strong>Delete chat</strong>
            <span>Delete for you or for everyone</span>
          </span>
        </button>

        <button type="button" className="conversation-options-sheet__cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </ProfileSheet>
  );
}
