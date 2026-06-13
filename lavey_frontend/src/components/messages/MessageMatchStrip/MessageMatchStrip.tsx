import { useEffect, useRef, useState } from 'react';
import type { Conversation } from '@/types';
import './MessageMatchStrip.css';

export type MessageMatchStripVariant = 'online' | 'recent';

interface MessageMatchStripProps {
  conversations: Conversation[];
  variant: MessageMatchStripVariant;
  onSelect: (id: string) => void;
  onAvatarClick: (conversation: Conversation) => void;
  ariaLabel: string;
}

function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.length > 9 ? `${first.slice(0, 8)}…` : first;
}

export function MessageMatchStrip({
  conversations,
  variant,
  onSelect,
  onAvatarClick,
  ariaLabel,
}: MessageMatchStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fitsScreen, setFitsScreen] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkFit = () => {
      setFitsScreen(el.scrollWidth <= el.clientWidth + 1);
    };

    checkFit();
    const observer = new ResizeObserver(checkFit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [conversations.length]);

  if (conversations.length === 0) return null;

  return (
    <section
      className={`msg-match-strip msg-match-strip--${variant}`}
      aria-label={ariaLabel}
    >
      <div
        ref={scrollRef}
        className={`msg-match-strip__scroll${fitsScreen ? ' msg-match-strip__scroll--centered' : ''}`}
        role="list"
      >
          {conversations.map((conversation) => {
            const hasUnread = conversation.unreadCount > 0;
            const isOnline = conversation.isOnline;
            const isTyping = conversation.isTyping;

            return (
              <div key={conversation.id} className="msg-match-strip__item" role="listitem">
                <button
                  type="button"
                  className="msg-match-strip__story"
                  onClick={() => onSelect(conversation.id)}
                  aria-label={`Open chat with ${conversation.participantName}`}
                >
                  <span
                    className={[
                      'msg-match-strip__ring',
                      variant === 'online' ? 'msg-match-strip__ring--online' : '',
                      variant === 'recent' && hasUnread ? 'msg-match-strip__ring--unread' : '',
                      variant === 'recent' && conversation.isPinned
                        ? 'msg-match-strip__ring--pinned'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden
                  >
                    <img
                      src={conversation.participantAvatar}
                      alt=""
                      className="msg-match-strip__avatar"
                    />
                  </span>

                  {variant === 'online' && isOnline && (
                    <span className="msg-match-strip__badge msg-match-strip__badge--online">
                      Online
                    </span>
                  )}

                  {variant === 'recent' && isTyping && (
                    <span className="msg-match-strip__badge msg-match-strip__badge--typing">
                      …
                    </span>
                  )}

                  {variant === 'recent' && !isTyping && hasUnread && (
                    <span className="msg-match-strip__badge msg-match-strip__badge--unread">
                      {conversation.unreadCount}
                    </span>
                  )}

                  {conversation.isPinned && variant === 'recent' && (
                    <span className="msg-match-strip__pin" aria-label="Starred">
                      ★
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className="msg-match-strip__name"
                  onClick={() => onAvatarClick(conversation)}
                >
                  {firstName(conversation.participantName)}
                </button>
              </div>
            );
          })}
        </div>
    </section>
  );
}

interface OnlineMatchesStripProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onAvatarClick: (conversation: Conversation) => void;
}

export function OnlineMatchesStrip({
  conversations,
  onSelect,
  onAvatarClick,
}: OnlineMatchesStripProps) {
  const online = conversations.filter((c) => c.isOnline);

  return (
    <MessageMatchStrip
      ariaLabel="Online matches"
      variant="online"
      conversations={online}
      onSelect={onSelect}
      onAvatarClick={onAvatarClick}
    />
  );
}

interface RecentMatchesStripProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onAvatarClick: (conversation: Conversation) => void;
}

export function RecentMatchesStrip({
  conversations,
  onSelect,
  onAvatarClick,
}: RecentMatchesStripProps) {
  return (
    <MessageMatchStrip
      ariaLabel="Recent chats"
      variant="recent"
      conversations={conversations}
      onSelect={onSelect}
      onAvatarClick={onAvatarClick}
    />
  );
}
