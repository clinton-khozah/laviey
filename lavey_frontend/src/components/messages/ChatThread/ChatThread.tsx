import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChatAssistPanel } from '@/components/messages/ChatAssistPanel';
import { ChatPhotoBubble } from '@/components/messages/ChatPhotoBubble';
import {
  ChatSendOptionsMenu,
  type ChatConversationAction,
} from '@/components/messages/ChatSendOptionsMenu';
import { DeleteMessageSheet } from '@/components/messages/DeleteMessageSheet';
import { MessageActionSheet } from '@/components/messages/MessageActionSheet';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { PageScroller } from '@/components/layout/PageScroller';
import { ChatDeliveryTicks } from '@/components/messages/ChatDeliveryTicks';
import { CHAT_STICKERS, isChatStickerMessage } from '@/constants/chatStickers';
import { APP_IMAGES } from '@/constants/images';
import { getChatHeaderStatus } from '@/utils/messages/getChatHeaderStatus';
import type { ChatMessage, Conversation, DeleteMessageScope } from '@/types';
import './ChatThread.css';
const LONG_PRESS_MS = 450;

interface ChatThreadProps {
  conversation: Conversation;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  onBack: () => void;
  onSend: (text: string) => void;
  onSendPhoto?: (file: File) => Promise<void>;
  onTypingChange?: (isTyping: boolean) => void;
  onProfileClick: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onDeleteMessage: (messageId: string, scope: DeleteMessageScope) => void | Promise<void>;
  onConversationAction: (action: ChatConversationAction) => void;
  isMuted?: boolean;
}

export function ChatThread({
  conversation,
  messages,
  isLoading,
  isSending,
  onBack,
  onSend,
  onSendPhoto,
  onTypingChange,
  onProfileClick,
  onReact,
  onDeleteMessage,
  onConversationAction,
  isMuted = false,
}: ChatThreadProps) {
  const [draft, setDraft] = useState('');
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [stickerTrayOpen, setStickerTrayOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [deleteMessageTarget, setDeleteMessageTarget] = useState<ChatMessage | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
    setStickerTrayOpen(false);
  };

  const handleSendSticker = (sticker: string) => {
    onSend(sticker);
    setStickerTrayOpen(false);
    onTypingChange?.(false);
  };

  const openActions = (msg: ChatMessage) => {
    setActionMessage(msg);
  };

  const closeActions = () => setActionMessage(null);

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handlePointerDown = (msg: ChatMessage) => {
    longPressTriggered.current = false;
    clearPressTimer();
    pressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      openActions(msg);
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = (msg: ChatMessage) => {
    clearPressTimer();
    if (!longPressTriggered.current) {
      openActions(msg);
    }
  };

  const handleReact = (emoji: string) => {
    if (!actionMessage) return;
    onReact(actionMessage.id, emoji);
  };

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onSendPhoto) return;

    setPhotoError(null);
    try {
      await onSendPhoto(file);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not send that photo.');
      window.setTimeout(() => setPhotoError(null), 3200);
    }
  };

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, messages.at(-1)?.id, messages.at(-1)?.sending]);

  return (
    <AppOverlay>
      <div className="chat-thread">
        <header className="chat-thread__header">
          <button type="button" className="chat-thread__back" onClick={onBack} aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button type="button" className="chat-thread__profile" onClick={onProfileClick}>
            <span className="chat-thread__avatar-wrap">
              <img src={conversation.participantAvatar} alt="" />
              {conversation.isOnline ? (
                <span className="chat-thread__online-dot" title="Online" aria-hidden />
              ) : null}
            </span>
            <div className="chat-thread__profile-text">
              <span className="chat-thread__name">{conversation.participantName}</span>
              {conversation.isTyping ? (
                <span className="chat-thread__status chat-thread__status--typing">
                  <span className="chat-thread__typing-dots" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                  writing to you…
                </span>
              ) : (
                <span
                  className={`chat-thread__status ${conversation.isOnline ? 'chat-thread__status--online' : ''}`}
                >
                  {getChatHeaderStatus(conversation)}
                </span>
              )}
            </div>
          </button>
          <div className="chat-thread__actions">
            <button type="button" className="chat-thread__action-btn" aria-label="Video call">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              type="button"
              className={`chat-thread__action-btn ${sendMenuOpen ? 'chat-thread__action-btn--active' : ''}`}
              aria-label="Conversation options"
              aria-expanded={sendMenuOpen}
              aria-haspopup="menu"
              onClick={() => setSendMenuOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="12" cy="5" r="1.75" />
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="12" cy="19" r="1.75" />
              </svg>
            </button>
          </div>
        </header>

        <ChatSendOptionsMenu
          open={sendMenuOpen}
          onClose={() => setSendMenuOpen(false)}
          onAction={onConversationAction}
          isPinned={conversation.isPinned}
          isMuted={isMuted}
        />

        <div className="chat-thread__body">
          <ChatAssistPanel
            conversationId={conversation.id}
            participantName={conversation.participantName}
            messages={messages}
            onPickSuggestion={(text) => {
              setDraft(text);
              setStickerTrayOpen(false);
              onTypingChange?.(text.trim().length > 0);
            }}
          />
          <div className="chat-thread__watermark" aria-hidden>
            <img src={APP_IMAGES.logo} alt="" />
          </div>
          <PageScroller className="chat-thread__scroll">
            {isLoading ? (
              <PageTransitionSplash />
            ) : (
              <div className="chat-thread__messages">
                <div className="chat-thread__date-pill">Today</div>
                {messages.map((msg) => {
                  const isPhoto = msg.kind === 'image';
                  const isSendingPhoto = isPhoto && msg.sending;
                  const isSticker = !isPhoto && isChatStickerMessage(msg.text);
                  return (
                <div
                  key={msg.id}
                  className={`chat-bubble-wrap chat-bubble-wrap--${msg.senderId === 'me' ? 'me' : 'them'} ${isSticker ? 'chat-bubble-wrap--sticker' : ''} ${isPhoto ? 'chat-bubble-wrap--photo' : ''} ${isSendingPhoto ? 'chat-bubble-wrap--sending' : ''} ${msg.reaction ? 'chat-bubble-wrap--has-reaction' : ''}`}
                >
                  <button
                    type="button"
                    className={`chat-bubble chat-bubble--${msg.senderId === 'me' ? 'me' : 'them'} ${isSticker ? 'chat-bubble--sticker' : ''} ${isPhoto ? 'chat-bubble--photo' : ''}`}
                    disabled={isSendingPhoto}
                    onPointerDown={() => !isPhoto && handlePointerDown(msg)}
                    onPointerUp={() => !isPhoto && handlePointerUp(msg)}
                    onPointerLeave={clearPressTimer}
                    onPointerCancel={clearPressTimer}
                    onContextMenu={(e) => {
                      if (isSendingPhoto) return;
                      e.preventDefault();
                      openActions(msg);
                    }}
                  >
                    {isPhoto ? (
                      <ChatPhotoBubble
                        message={msg}
                        onOpenActions={() => openActions(msg)}
                        onRequestDelete={() => setDeleteMessageTarget(msg)}
                      />
                    ) : (
                      <p className={isSticker ? 'chat-bubble__sticker' : 'chat-bubble__text'}>{msg.text}</p>
                    )}
                    <div className="chat-bubble__meta">
                      <span className="chat-bubble__time">{msg.sentAt}</span>
                      {msg.senderId === 'me' && (
                        <ChatDeliveryTicks
                          read={msg.read}
                          recipientOnline={conversation.isOnline}
                        />
                      )}
                    </div>
                  </button>
                  {msg.reaction && (
                    <span className="chat-bubble__reaction" aria-label={`Reaction ${msg.reaction}`}>
                      {msg.reaction}
                    </span>
                  )}
                </div>
                  );
                })}
                <div ref={scrollEndRef} className="chat-thread__scroll-end" aria-hidden />
              </div>
            )}
          </PageScroller>
        </div>

        <div className="chat-thread__footer">
          {photoError ? (
            <p className="chat-thread__photo-error" role="alert">
              {photoError}
            </p>
          ) : null}
          {stickerTrayOpen ? (
            <div className="chat-thread__sticker-tray" role="toolbar" aria-label="Stickers">
              {CHAT_STICKERS.map((sticker) => (
                <button
                  key={sticker}
                  type="button"
                  className="chat-thread__sticker-btn"
                  disabled={isSending}
                  aria-label={`Send ${sticker} sticker`}
                  onClick={() => handleSendSticker(sticker)}
                >
                  {sticker}
                </button>
              ))}
            </div>
          ) : null}
          <form className="chat-thread__composer" onSubmit={handleSubmit}>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="chat-thread__photo-input"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => void handlePhotoPick(e)}
            />
            {onSendPhoto ? (
              <button
                type="button"
                className="chat-thread__photo-btn"
                aria-label="Send photo"
                disabled={isSending}
                onClick={() => photoInputRef.current?.click()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="M4 7a3 3 0 013-3h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7z" />
                  <circle cx="12" cy="12" r="3.25" />
                </svg>
              </button>
            ) : null}
            <button
              type="button"
              className={`chat-thread__sticker-toggle ${stickerTrayOpen ? 'chat-thread__sticker-toggle--active' : ''}`}
              aria-label={stickerTrayOpen ? 'Hide stickers' : 'Stickers'}
              aria-expanded={stickerTrayOpen}
              onClick={() => setStickerTrayOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
                <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <input
              type="text"
              className="chat-thread__input"
              placeholder="Say something sweet…"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                onTypingChange?.(e.target.value.trim().length > 0);
              }}
              onBlur={() => onTypingChange?.(false)}
              disabled={isSending}
            />
            <button
              type="submit"
              className="chat-thread__send"
              disabled={isSending || !draft.trim()}
              aria-label="Send"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      <MessageActionSheet
        open={actionMessage !== null}
        message={actionMessage}
        onClose={closeActions}
        onReact={handleReact}
        onRequestDelete={() => {
          setDeleteMessageTarget(actionMessage);
        }}
      />

      <DeleteMessageSheet
        open={deleteMessageTarget !== null}
        message={deleteMessageTarget}
        participantName={conversation.participantName}
        onClose={() => setDeleteMessageTarget(null)}
        onDelete={async (scope) => {
          if (!deleteMessageTarget) return;
          await onDeleteMessage(deleteMessageTarget.id, scope);
          setDeleteMessageTarget(null);
        }}
      />
    </AppOverlay>
  );
}
