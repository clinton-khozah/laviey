import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { MESSAGE_REACTION_EMOJIS } from '@/constants/messageReactions';
import type { ChatMessage } from '@/types';
import './MessageActionSheet.css';

interface MessageActionSheetProps {
  open: boolean;
  message: ChatMessage | null;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onRequestDelete: () => void;
}

export function MessageActionSheet({
  open,
  message,
  onClose,
  onReact,
  onReply,
  onRequestDelete,
}: MessageActionSheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleReact = (emoji: string) => {
    onReact(emoji);
    onClose();
  };

  const handleRequestDelete = () => {
    onRequestDelete();
    onClose();
  };

  const handleReply = () => {
    onReply();
    onClose();
  };

  return (
    <AppOverlay>
      <AnimatePresence>
        {open && message && (
          <>
            <motion.button
              type="button"
              className="message-action-sheet__backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              aria-label="Close"
            />
            <motion.div
              className="message-action-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              role="dialog"
              aria-modal="true"
              aria-label="Message options"
            >
              <div className="message-action-sheet__handle" aria-hidden />

              <div className="message-action-sheet__section">
                <span className="message-action-sheet__label">React</span>
                <div className="message-action-sheet__reactions" role="group" aria-label="Choose reaction">
                  {MESSAGE_REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`message-action-sheet__emoji ${message.reaction === emoji ? 'message-action-sheet__emoji--active' : ''}`}
                      onClick={() => handleReact(emoji)}
                      aria-label={`React with ${emoji}`}
                      aria-pressed={message.reaction === emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="message-action-sheet__section message-action-sheet__section--actions">
                <div className="message-action-sheet__actions-row">
                  <span className="message-action-sheet__label">Message</span>
                  <div className="message-action-sheet__action-buttons">
                    <button type="button" className="message-action-sheet__reply-icon" onClick={handleReply} aria-label="Reply to message" title="Reply">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 17l-5-5 5-5M4 12h9a7 7 0 017 7" /></svg>
                    </button>
                    <button
                      type="button"
                      className="message-action-sheet__delete-icon"
                      onClick={handleRequestDelete}
                      aria-label="Delete message"
                      title="Delete message"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppOverlay>
  );
}
