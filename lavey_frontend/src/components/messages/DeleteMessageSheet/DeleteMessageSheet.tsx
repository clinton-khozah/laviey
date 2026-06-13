import { useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import type { ChatMessage, DeleteMessageScope } from '@/types';
import '@/components/rooms/meetupTopSheet.css';
import './DeleteMessageSheet.css';

interface DeleteMessageSheetProps {
  open: boolean;
  message: ChatMessage | null;
  participantName: string;
  onClose: () => void;
  onDelete: (scope: DeleteMessageScope) => void | Promise<void>;
}

function deleteLead(message: ChatMessage): string {
  if (message.kind === 'image') return 'Delete this photo?';
  const text = message.text.trim();
  if (!text || text === '📷 Photo') return 'Delete this message?';
  if (text.length <= 40) return `Delete "${text}"?`;
  return `Delete "${text.slice(0, 37).trim()}…"?`;
}

export function DeleteMessageSheet({
  open,
  message,
  participantName,
  onClose,
  onDelete,
}: DeleteMessageSheetProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const isOwn = message?.senderId === 'me';

  const handleDelete = async (scope: DeleteMessageScope) => {
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
    <ProfileSheet
      open={open}
      title="Delete message"
      fromTop
      compact
      hideHandle
      onClose={onClose}
    >
      {message ? (
        <div className="meetup-top-sheet delete-message-sheet">
          <p className="delete-message-sheet__lead">{deleteLead(message)}</p>

          <button
            type="button"
            className="delete-message-sheet__option"
            onClick={() => void handleDelete('for_you')}
            disabled={isDeleting}
          >
            <span className="delete-message-sheet__option-title">Delete for you</span>
            <span className="delete-message-sheet__option-desc">
              Removes this message from your chat only. {participantName} can still see it.
            </span>
          </button>

          {isOwn ? (
            <button
              type="button"
              className="delete-message-sheet__option delete-message-sheet__option--danger"
              onClick={() => void handleDelete('for_both')}
              disabled={isDeleting}
            >
              <span className="delete-message-sheet__option-title">Delete for everyone</span>
              <span className="delete-message-sheet__option-desc">
                Unsends this message for you and {participantName}. This can&apos;t be undone.
              </span>
            </button>
          ) : null}

          <button
            type="button"
            className="delete-message-sheet__cancel"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </ProfileSheet>
  );
}
