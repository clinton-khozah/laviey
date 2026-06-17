import { useEffect, useMemo, useRef, useState } from 'react';
import type { Conversation } from '@/types';
import './MessageMatchStrip.css';

export type MessageMatchStripVariant = 'online' | 'recent' | 'matches';

interface MessageMatchStripProps {
  conversations: Conversation[];
  variant: MessageMatchStripVariant;
  onSelect: (id: string) => void;
  onAvatarClick: (conversation: Conversation) => void;
  ariaLabel: string;
  title?: string;
}

function dedupeConversations(conversations: Conversation[]): Conversation[] {
  const seen = new Set<string>();
  return conversations.filter((conversation) => {
    if (seen.has(conversation.id)) return false;
    seen.add(conversation.id);
    return true;
  });
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
  title,
}: MessageMatchStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fitsScreen, setFitsScreen] = useState(false);
  const items = useMemo(() => dedupeConversations(conversations), [conversations]);

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
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <section
      className={`msg-match-strip msg-match-strip--${variant}`}
      aria-label={ariaLabel}
    >
      {title ? <h2 className="msg-match-strip__title">{title}</h2> : null}
      <div
        ref={scrollRef}
        className={`msg-match-strip__scroll${fitsScreen ? ' msg-match-strip__scroll--centered' : ''}`}
        role="list"
      >
          {items.map((conversation) => {
            const hasUnread = conversation.unreadCount > 0;
            const isOnline = conversation.isOnline;
            const isTyping = conversation.isTyping;
            const showOnlineRing = isOnline;

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
                      showOnlineRing ? 'msg-match-strip__ring--online' : '',
                      !showOnlineRing && variant === 'recent' && hasUnread
                        ? 'msg-match-strip__ring--unread'
                        : '',
                      !showOnlineRing && variant === 'recent' && conversation.isPinned
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

                  {(variant === 'recent' || variant === 'matches') && isTyping && (
                    <span className="msg-match-strip__badge msg-match-strip__badge--typing">
                      …
                    </span>
                  )}

                  {(variant === 'recent' || variant === 'matches') && !isTyping && hasUnread && (
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
                  className="msg-match-strip__name-row"
                  onClick={() => onAvatarClick(conversation)}
                >
                  <span className="msg-match-strip__name">
                    {firstName(conversation.participantName)}
                  </span>
                  {isOnline ? <span className="msg-match-strip__online">Online</span> : null}
                </button>
              </div>
            );
          })}
        </div>
    </section>
  );
}

interface MatchAvatarsStripProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onAvatarClick: (conversation: Conversation) => void;
  title?: string;
}

export function MatchAvatarsStrip({
  conversations,
  onSelect,
  onAvatarClick,
  title,
}: MatchAvatarsStripProps) {
  return (
    <MessageMatchStrip
      ariaLabel="Matches"
      variant="matches"
      title={title}
      conversations={conversations}
      onSelect={onSelect}
      onAvatarClick={onAvatarClick}
    />
  );
}

interface OnlineMatchesStripProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onAvatarClick: (conversation: Conversation) => void;
  title?: string;
}

export function OnlineMatchesStrip({
  conversations,
  onSelect,
  onAvatarClick,
  title = 'Online',
}: OnlineMatchesStripProps) {
  const online = conversations.filter((c) => c.isOnline);

  return (
    <MessageMatchStrip
      ariaLabel="Online matches"
      variant="online"
      title={title}
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
