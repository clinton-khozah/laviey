import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MEETING_REACTION_EMOJI,
  MEETING_REACTION_LABEL,
  type MeetingReactionType,
} from '@/constants/meeting/meetingReactions';
import type { MeetingChatMessage } from '@/types';
import './MeetingChatPanel.css';

interface MeetingChatPanelProps {
  open: boolean;
  messages: MeetingChatMessage[];
  localUserId: string;
  onClose: () => void;
  onSendMessage: (text: string) => boolean;
  onSendReaction: (type: MeetingReactionType) => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

const QUICK_REACTIONS: MeetingReactionType[] = ['like', 'live', 'love'];

export function MeetingChatPanel({
  open,
  messages,
  localUserId,
  onClose,
  onSendMessage,
  onSendReaction,
}: MeetingChatPanelProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages, open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    if (onSendMessage(draft)) {
      setDraft('');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          className="meeting-chat"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          aria-label="Meetup chat"
        >
          <header className="meeting-chat__header">
            <div>
              <h2 className="meeting-chat__title">Chat</h2>
              <p className="meeting-chat__subtitle">Message everyone in this meetup</p>
            </div>
            <button type="button" className="meeting-chat__close" onClick={onClose} aria-label="Close chat">
              ×
            </button>
          </header>

          <ul ref={listRef} className="meeting-chat__messages" role="log" aria-live="polite">
            {messages.length === 0 ? (
              <li className="meeting-chat__empty">Say hi — reactions show on video too ✨</li>
            ) : (
              messages.map((message) => {
                const isMine = message.fromUserId === localUserId;
                return (
                  <li
                    key={message.id}
                    className={`meeting-chat__message ${isMine ? 'meeting-chat__message--mine' : ''}`}
                  >
                    {!isMine && (
                      <span className="meeting-chat__sender">{message.fromName.split(' ')[0]}</span>
                    )}
                    <div className="meeting-chat__bubble">
                      <p>{message.text}</p>
                      <time className="meeting-chat__time" dateTime={message.sentAt}>
                        {formatTime(message.sentAt)}
                      </time>
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          <div className="meeting-chat__reactions" role="group" aria-label="Quick reactions">
            {QUICK_REACTIONS.map((type) => (
              <button
                key={type}
                type="button"
                className="meeting-chat__reaction"
                onClick={() => onSendReaction(type)}
                aria-label={MEETING_REACTION_LABEL[type]}
              >
                {MEETING_REACTION_EMOJI[type]}
              </button>
            ))}
          </div>

          <form className="meeting-chat__composer" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="meeting-chat__input"
              placeholder="Type a message…"
              value={draft}
              maxLength={500}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Chat message"
            />
            <button type="submit" className="meeting-chat__send" disabled={!draft.trim()}>
              Send
            </button>
          </form>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
