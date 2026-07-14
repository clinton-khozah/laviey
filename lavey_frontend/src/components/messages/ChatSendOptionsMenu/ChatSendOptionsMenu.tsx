import { useEffect, useState, type ReactNode } from 'react';
import { useChatTypingStyle } from '@/hooks';
import { settingsService } from '@/services/settings/settingsService';
import { CHAT_TYPING_STYLE_OPTIONS, type ChatTypingStyle } from '@/types/domain/chatTypingStyle.types';
import './ChatSendOptionsMenu.css';

export type ChatConversationAction =
  | 'view-profile'
  | 'pin'
  | 'mute'
  | 'mark-unread'
  | 'archive'
  | 'report'
  | 'block'
  | 'unmatch'
  | 'delete-chat';

type ChatConversationOption = {
  id: ChatConversationAction;
  label: string;
  icon: ReactNode;
  tone?: 'default' | 'danger';
  dividerBefore?: boolean;
};

function OptionIcon({ children }: { children: ReactNode }) {
  return (
    <span className="chat-send-menu__icon" aria-hidden>
      {children}
    </span>
  );
}

function buildOptions(isPinned: boolean, isMuted: boolean): ChatConversationOption[] {
  return [
    {
      id: 'view-profile',
      label: 'View profile',
      icon: (
        <OptionIcon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </OptionIcon>
      ),
    },
    {
      id: 'pin',
      label: isPinned ? 'Unpin chat' : 'Pin chat',
      icon: (
        <OptionIcon>
          <svg viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M12 17v5M9 3h6l1 7h4l-5 6v4H9v-4L4 10h4l1-7z" />
          </svg>
        </OptionIcon>
      ),
    },
    {
      id: 'mute',
      label: isMuted ? 'Unmute notifications' : 'Mute notifications',
      icon: (
        <OptionIcon>
          {isMuted ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13.73 21a2 2 0 01-3.46 0" />
              <path d="M18.63 13A17.89 17.89 0 0118 8" />
              <path d="M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14" />
              <path d="M1 1l22 22" />
            </svg>
          )}
        </OptionIcon>
      ),
    },
    {
      id: 'mark-unread',
      label: 'Mark as unread',
      icon: (
        <OptionIcon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <path d="M22 6l-10 7L2 6" />
            <circle cx="18" cy="8" r="3" fill="currentColor" stroke="none" />
          </svg>
        </OptionIcon>
      ),
    },
    {
      id: 'archive',
      label: 'Archive chat',
      icon: (
        <OptionIcon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 8v13H3V8" />
            <path d="M1 3h22v5H1z" />
            <path d="M10 12h4" />
          </svg>
        </OptionIcon>
      ),
    },
    {
      id: 'report',
      label: 'Report',
      dividerBefore: true,
      icon: (
        <OptionIcon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <path d="M4 22v-7" />
          </svg>
        </OptionIcon>
      ),
    },
    {
      id: 'block',
      label: 'Block',
      tone: 'danger',
      icon: (
        <OptionIcon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M4.93 4.93l14.14 14.14" />
          </svg>
        </OptionIcon>
      ),
    },
    {
      id: 'unmatch',
      label: 'Unmatch',
      tone: 'danger',
      icon: (
        <OptionIcon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
            <path d="M3 3l18 18" />
          </svg>
        </OptionIcon>
      ),
    },
    {
      id: 'delete-chat',
      label: 'Delete chat',
      tone: 'danger',
      icon: (
        <OptionIcon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
          </svg>
        </OptionIcon>
      ),
    },
  ];
}

interface ChatSendOptionsMenuProps {
  open: boolean;
  onClose: () => void;
  onAction: (action: ChatConversationAction) => void;
  isPinned?: boolean;
  isMuted?: boolean;
}

export function ChatSendOptionsMenu({
  open,
  onClose,
  onAction,
  isPinned = false,
  isMuted = false,
}: ChatSendOptionsMenuProps) {
  const options = buildOptions(isPinned, isMuted);
  const { chatTypingStyle, setChatTypingStyle } = useChatTypingStyle();
  const [isSavingStyle, setIsSavingStyle] = useState(false);
  const [styleError, setStyleError] = useState<string | null>(null);

  const handleStyleChange = async (next: ChatTypingStyle) => {
    if (next === chatTypingStyle || isSavingStyle) return;
    const previous = chatTypingStyle;
    setStyleError(null);
    setIsSavingStyle(true);
    setChatTypingStyle(next);
    try {
      await settingsService.updateSettings({ chatTypingStyle: next });
    } catch {
      setChatTypingStyle(previous);
      setStyleError('Could not save font');
    } finally {
      setIsSavingStyle(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button type="button" className="chat-send-menu__backdrop" onClick={onClose} aria-label="Close menu" />
      <div className="chat-send-menu" role="menu" aria-label="Conversation options">
        <div className="chat-send-menu__font-section">
          <div className="chat-send-menu__font-heading">
            <span className="chat-send-menu__font-icon" aria-hidden>Aa</span>
            <span className="chat-send-menu__font-label">Chat font</span>
          </div>
          <div className="chat-send-menu__fonts" role="radiogroup" aria-label="Chat font">
            {CHAT_TYPING_STYLE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={chatTypingStyle === option.id}
                disabled={isSavingStyle}
                className={`chat-send-menu__font chat-send-menu__font--${option.id} ${chatTypingStyle === option.id ? 'is-active' : ''}`}
                onClick={() => void handleStyleChange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {styleError ? <span className="chat-send-menu__font-error" role="alert">{styleError}</span> : null}
        </div>
        <ul className="chat-send-menu__list">
          {options.map((option) => (
            <li key={option.id} role="none" className={option.dividerBefore ? 'chat-send-menu__divider' : undefined}>
              <button
                type="button"
                role="menuitem"
                className={`chat-send-menu__item ${option.tone === 'danger' ? 'chat-send-menu__item--danger' : ''}`}
                onClick={() => {
                  onAction(option.id);
                  onClose();
                }}
              >
                {option.icon}
                <span className="chat-send-menu__label">{option.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
