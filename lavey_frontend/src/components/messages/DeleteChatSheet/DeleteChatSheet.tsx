import { useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import type { DeleteConversationScope } from '@/types';
import './DeleteChatSheet.css';

interface DeleteChatSheetProps {
  open: boolean;
  participantName: string;
  participantAvatar: string;
  onClose: () => void;
  onDelete: (scope: DeleteConversationScope) => void | Promise<void>;
}

export function DeleteChatSheet({
  open,
  participantName,
  participantAvatar,
  onClose,
  onDelete,
}: DeleteChatSheetProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (scope: DeleteConversationScope) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(scope);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ProfileSheet open={open} title="Delete chat" onClose={onClose} hideHandle>
      <div className="delete-chat-sheet">
        <div className="delete-chat-sheet__intro">
          <img src={participantAvatar} alt="" className="delete-chat-sheet__avatar" />
          <p className="delete-chat-sheet__heading">
            Delete your chat with <strong>{participantName}</strong>?
          </p>
        </div>

        <button
          type="button"
          className="delete-chat-sheet__option"
          onClick={() => void handleDelete('for_you')}
          disabled={isDeleting}
        >
          <span className="delete-chat-sheet__option-title">Delete for you</span>
          <span className="delete-chat-sheet__option-desc">
            Removes this chat from your inbox only. {participantName} can still see the
            conversation.
          </span>
        </button>

        <button
          type="button"
          className="delete-chat-sheet__option delete-chat-sheet__option--danger"
          onClick={() => void handleDelete('for_both')}
          disabled={isDeleting}
        >
          <span className="delete-chat-sheet__option-title">Delete for everyone</span>
          <span className="delete-chat-sheet__option-desc">
            Removes the chat for you and {participantName}. This can&apos;t be undone.
          </span>
        </button>

        <button
          type="button"
          className="delete-chat-sheet__cancel"
          onClick={onClose}
          disabled={isDeleting}
        >
          Cancel
        </button>
      </div>
    </ProfileSheet>
  );
}
