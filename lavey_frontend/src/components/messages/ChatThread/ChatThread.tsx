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
  onSendAudio?: (audio: Blob) => Promise<void>;
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
  onSendAudio,
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
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const sendRecordingRef = useRef(false);
  const recordingTimerRef = useRef<number | null>(null);

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

    setMediaError(null);
    try {
      await onSendPhoto(file);
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Could not send that photo.');
      window.setTimeout(() => setMediaError(null), 3200);
    }
  };

  const clearRecording = () => {
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
    recorderStreamRef.current = null;
    recorderRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const finishRecording = (send: boolean) => {
    sendRecordingRef.current = send;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    else clearRecording();
  };

  const startRecording = async () => {
    if (!onSendAudio) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMediaError('Voice recording is not supported on this browser.');
      return;
    }
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64_000 })
        : new MediaRecorder(stream);
      recorderStreamRef.current = stream;
      recorderRef.current = recorder;
      recorderChunksRef.current = [];
      sendRecordingRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recorderChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recorderChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const shouldSend = sendRecordingRef.current && blob.size > 0;
        clearRecording();
        if (shouldSend) {
          void onSendAudio(blob).catch((error) => {
            setMediaError(error instanceof Error ? error.message : 'Could not send voice message.');
          });
        }
      };
      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((seconds) => {
          if (seconds >= 119) {
            window.setTimeout(() => finishRecording(true), 0);
            return 120;
          }
          return seconds + 1;
        });
      }, 1000);
    } catch {
      clearRecording();
      setMediaError('Allow microphone access to record a voice message.');
    }
  };

  useEffect(() => () => {
    sendRecordingRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    clearRecording();
  }, []);

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
              <div className="chat-thread__name-row">
                <span className="chat-thread__name">{conversation.participantName}</span>
                {conversation.isTyping ? (
                  <span className="chat-thread__status chat-thread__status--typing">
                    <span className="chat-thread__typing-dots" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                    writing…
                  </span>
                ) : (
                  <span
                    className={`chat-thread__status ${conversation.isOnline ? 'chat-thread__status--online' : ''}`}
                  >
                    {getChatHeaderStatus(conversation)}
                  </span>
                )}
              </div>
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
                  const isAudio = msg.kind === 'audio';
                  const isSendingMedia = (isPhoto || isAudio) && msg.sending;
                  const isSticker = !isPhoto && !isAudio && isChatStickerMessage(msg.text);
                  return (
                <div
                  key={msg.id}
                  className={`chat-bubble-wrap chat-bubble-wrap--${msg.senderId === 'me' ? 'me' : 'them'} ${isSticker ? 'chat-bubble-wrap--sticker' : ''} ${isPhoto ? 'chat-bubble-wrap--photo' : ''} ${isAudio ? 'chat-bubble-wrap--audio' : ''} ${isSendingMedia ? 'chat-bubble-wrap--sending' : ''} ${msg.reaction ? 'chat-bubble-wrap--has-reaction' : ''}`}
                >
                  <div
                    className={`chat-bubble chat-bubble--${msg.senderId === 'me' ? 'me' : 'them'} ${isSticker ? 'chat-bubble--sticker' : ''} ${isPhoto ? 'chat-bubble--photo' : ''} ${isAudio ? 'chat-bubble--audio' : ''}`}
                    aria-disabled={isSendingMedia}
                    onPointerDown={() => !isPhoto && !isAudio && handlePointerDown(msg)}
                    onPointerUp={() => !isPhoto && !isAudio && handlePointerUp(msg)}
                    onPointerLeave={clearPressTimer}
                    onPointerCancel={clearPressTimer}
                    onContextMenu={(e) => {
                      if (isSendingMedia) return;
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
                    ) : isAudio ? (
                      <div className="chat-bubble__audio-row">
                        <span className="chat-bubble__audio-icon" aria-hidden>🎙</span>
                        {msg.audioUrl ? (
                          <audio controls preload="metadata" src={msg.audioUrl}>
                            Your browser does not support audio playback.
                          </audio>
                        ) : (
                          <span className="chat-bubble__audio-unavailable">
                            {msg.sending ? 'Sending voice message…' : 'Voice message unavailable'}
                          </span>
                        )}
                        {!msg.sending ? (
                          <button type="button" className="chat-bubble__audio-menu" aria-label="Voice message options" onClick={() => openActions(msg)}>•••</button>
                        ) : null}
                      </div>
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
                  </div>
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
          {mediaError ? (
            <p className="chat-thread__photo-error" role="alert">
              {mediaError}
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
          {isRecording ? (
            <div className="chat-thread__recorder" role="group" aria-label="Recording voice message">
              <button type="button" className="chat-thread__record-cancel" onClick={() => finishRecording(false)} aria-label="Cancel recording">×</button>
              <span className="chat-thread__record-dot" aria-hidden />
              <span className="chat-thread__record-time">{Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}</span>
              <span className="chat-thread__record-label">Recording…</span>
              <button type="button" className="chat-thread__record-send" onClick={() => finishRecording(true)} aria-label="Stop and send voice message">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
              </button>
            </div>
          ) : <form className="chat-thread__composer" onSubmit={handleSubmit}>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="chat-thread__photo-input"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => void handlePhotoPick(e)}
            />
            {onSendAudio ? (
              <button type="button" className="chat-thread__voice-btn" aria-label="Record voice message" disabled={isSending} onClick={() => void startRecording()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3M9 21h6" />
                </svg>
              </button>
            ) : null}
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
          </form>}
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
