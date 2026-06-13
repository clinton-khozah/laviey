import { useRef, useState } from 'react';
import { ChatPhotoViewer } from '@/components/messages/ChatPhotoViewer';
import { APP_IMAGES } from '@/constants/images';
import type { ChatMessage } from '@/types';
import './ChatPhotoBubble.css';

const LONG_PRESS_MS = 450;

interface ChatPhotoBubbleProps {
  message: ChatMessage;
  onOpenActions: () => void;
  onRequestDelete: () => void;
}

function formatExpiresLabel(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 1) return `${hours}h left`;
  return `${Math.max(1, mins)}m left`;
}

export function ChatPhotoBubble({ message, onOpenActions, onRequestDelete }: ChatPhotoBubbleProps) {
  const isOwn = message.senderId === 'me';
  const [revealed, setRevealed] = useState(isOwn);
  const [viewerOpen, setViewerOpen] = useState(false);
  const showImage = isOwn || revealed;
  const expiresLabel = formatExpiresLabel(message.expiresAt);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handlePointerDown = () => {
    longPressTriggered.current = false;
    clearPressTimer();
    pressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      onOpenActions();
    }, LONG_PRESS_MS);
  };

  const handleOpenViewer = () => {
    if (longPressTriggered.current || !message.imageUrl) return;
    setViewerOpen(true);
  };

  if (message.sending) {
    return (
      <>
        <button
          type="button"
          className="chat-photo chat-photo--sending"
          aria-busy="true"
          disabled={!message.imageUrl}
          onClick={handleOpenViewer}
        >
          {message.imageUrl ? (
            <img
              src={message.imageUrl}
              alt=""
              draggable={false}
              className="chat-photo__img chat-photo__img--preview"
            />
          ) : null}
          <div className="chat-photo__sending-overlay">
            <div className="chat-photo__sending-spinner" aria-hidden />
            <p>Sending photo…</p>
          </div>
        </button>
        {message.imageUrl ? (
          <ChatPhotoViewer
            open={viewerOpen}
            imageUrl={message.imageUrl}
            isOwn={isOwn}
            onClose={() => setViewerOpen(false)}
            onRequestDelete={onRequestDelete}
          />
        ) : null}
      </>
    );
  }

  if (message.expired || !message.imageUrl) {
    return (
      <div className="chat-photo chat-photo--expired">
        <span className="chat-photo__expired-icon" aria-hidden>
          🕐
        </span>
        <p>Photo expired</p>
        <span className="chat-photo__expired-hint">Removed after 24 hours</span>
      </div>
    );
  }

  return (
    <>
      <div
        className={`chat-photo ${isOwn ? 'chat-photo--own' : ''}`}
        onContextMenu={(event) => {
          event.preventDefault();
          onOpenActions();
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        {!showImage ? (
          <button
            type="button"
            className="chat-photo__tap"
            onClick={() => setRevealed(true)}
          >
            <span className="chat-photo__tap-icon" aria-hidden>
              📷
            </span>
            <span className="chat-photo__tap-title">Tap to view photo</span>
            <span className="chat-photo__tap-hint">
              Private · deleted in 24h · can&apos;t save
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="chat-photo__viewer"
            onClick={handleOpenViewer}
            onPointerDown={handlePointerDown}
            onPointerUp={clearPressTimer}
            onPointerLeave={clearPressTimer}
            onPointerCancel={clearPressTimer}
            aria-label="View photo full screen — hold for options"
          >
            <img
              src={message.imageUrl}
              alt=""
              draggable={false}
              className="chat-photo__img"
            />
            <div className="chat-photo__shield" aria-hidden>
              <img src={APP_IMAGES.logo} alt="" className="chat-photo__watermark" />
            </div>
            {expiresLabel ? (
              <span className="chat-photo__ttl">{expiresLabel}</span>
            ) : null}
          </button>
        )}
      </div>

      <ChatPhotoViewer
        open={viewerOpen}
        imageUrl={message.imageUrl}
        isOwn={isOwn}
        expiresLabel={expiresLabel}
        onClose={() => setViewerOpen(false)}
        onRequestDelete={onRequestDelete}
      />
    </>
  );
}
