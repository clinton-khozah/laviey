import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isChatStickerMessage } from '@/constants/chatStickers';
import { APP_IMAGES } from '@/constants/images';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { chatAssistService } from '@/services/messages/chatAssistService';
import type { ChatAssistResult, ChatMessage } from '@/types';
import { chatAssistFirstName, polishMoodExplanation, polishSuggestions } from '@/utils/messages/formatChatAssist';
import '@/components/rooms/meetupTopSheet.css';
import './ChatAssistPanel.css';

const FAB_SIZE = 56;
const EDGE = 10;
const DRAG_THRESHOLD = 6;

interface ChatAssistPanelProps {
  conversationId: string;
  participantName: string;
  messages: ChatMessage[];
  onPickSuggestion: (text: string) => void;
}

interface FloatPosition {
  x: number;
  y: number;
}

function toTranscript(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.kind !== 'image' && !isChatStickerMessage(m.text))
    .map((m) => ({
      sender: m.senderId,
      text: m.text,
    }));
}

function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
): FloatPosition {
  const maxX = Math.max(EDGE, width - FAB_SIZE - EDGE);
  const maxY = Math.max(EDGE, height - FAB_SIZE - EDGE);
  return {
    x: Math.min(maxX, Math.max(EDGE, x)),
    y: Math.min(maxY, Math.max(EDGE, y)),
  };
}

function defaultPosition(width: number, height: number): FloatPosition {
  return clampPosition(EDGE, height - FAB_SIZE - EDGE, width, height);
}

export function ChatAssistPanel({
  conversationId,
  participantName,
  messages,
  onPickSuggestion,
}: ChatAssistPanelProps) {
  const boundsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const [open, setOpen] = useState(false);
  const [moodExpanded, setMoodExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChatAssistResult | null>(null);
  const [pos, setPos] = useState<FloatPosition | null>(null);
  const requestRef = useRef(0);
  const suppressClickRef = useRef(false);
  const messagesRef = useRef(messages);

  messagesRef.current = messages;

  const matchFirstName = useMemo(() => chatAssistFirstName(participantName), [participantName]);

  const displayResult = useMemo(() => {
    if (!result) return null;
    return {
      ...result,
      moodExplanation: polishMoodExplanation(result.moodExplanation, participantName),
      suggestions: polishSuggestions(result.suggestions, participantName),
    };
  }, [participantName, result]);

  const placeDefault = useCallback(() => {
    const bounds = boundsRef.current;
    if (!bounds) return;
    const { width, height } = bounds.getBoundingClientRect();
    setPos(defaultPosition(width, height));
  }, []);

  useEffect(() => {
    placeDefault();
    const bounds = boundsRef.current;
    if (!bounds) return undefined;

    const observer = new ResizeObserver(() => {
      setPos((current) => {
        const { width, height } = bounds.getBoundingClientRect();
        if (!current) return defaultPosition(width, height);
        return clampPosition(current.x, current.y, width, height);
      });
    });

    observer.observe(bounds);
    return () => observer.disconnect();
  }, [placeDefault]);

  const loadAssist = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const data = await chatAssistService.analyze(
        conversationId,
        participantName,
        toTranscript(messagesRef.current),
      );
      if (requestRef.current !== requestId) return;
      setResult(data);
      setMoodExpanded(true);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : 'Could not read this chat right now.');
      setResult(null);
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [conversationId, participantName]);

  const openAssist = useCallback(() => {
    setOpen(true);
    void loadAssist();
  }, [loadAssist]);

  const closeAssist = useCallback(() => {
    requestRef.current += 1;
    setOpen(false);
    setLoading(false);
  }, []);

  const moodPreview =
    displayResult && !moodExpanded
      ? `${displayResult.moodExplanation.slice(0, 88).trim()}…`
      : null;

  const handleFabPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    dragRef.current = {
      active: true,
      moved: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleFabPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    drag.moved = true;
    closeAssist();

    const bounds = boundsRef.current;
    if (!bounds) return;
    const { width, height } = bounds.getBoundingClientRect();
    setPos(clampPosition(drag.originX + dx, drag.originY + dy, width, height));
  };

  const handleFabPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== e.pointerId) return;

    drag.active = false;
    suppressClickRef.current = drag.moved;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleFabClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    openAssist();
  };

  const refreshButton = (
    <button
      type="button"
      className="chat-assist__refresh"
      onClick={() => void loadAssist()}
      aria-label="Refresh"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 4v6h6M20 20v-6h-6" />
        <path d="M20 9A8 8 0 006.34 6.34M4 15a8 8 0 0013.66 2.66" />
      </svg>
    </button>
  );

  return (
    <>
      <div ref={boundsRef} className="chat-assist-float" aria-hidden={false}>
        {pos ? (
          <div
            className="chat-assist-float__anchor"
            style={{ left: pos.x, top: pos.y, width: FAB_SIZE, height: FAB_SIZE }}
          >
            <button
              type="button"
              className={`chat-assist-fab ${open ? 'chat-assist-fab--open' : ''}`}
              onPointerDown={handleFabPointerDown}
              onPointerMove={handleFabPointerMove}
              onPointerUp={handleFabPointerUp}
              onPointerCancel={handleFabPointerUp}
              onClick={handleFabClick}
              aria-expanded={open}
              aria-controls="chat-assist-panel"
              aria-label="Loviey reply ideas and mood"
            >
              <img src={APP_IMAGES.logo} alt="" className="chat-assist-fab__logo" />
              <VerifiedBadge
                size="sm"
                ring
                className="chat-assist-fab__verified"
                title="Loviey"
              />
            </button>
          </div>
        ) : null}
      </div>

      <ProfileSheet
        open={open}
        title="Reply ideas & mood"
        fromTop
        compact
        hideHandle
        onClose={closeAssist}
        headerAction={loading ? undefined : refreshButton}
      >
        <div id="chat-assist-panel" className="meetup-top-sheet chat-assist-sheet" aria-live="polite">
          <p className="chat-assist-sheet__subtitle">With {matchFirstName}</p>

          {loading ? (
            <div className="chat-assist__loading" aria-busy="true">
              <div className="chat-assist__loading-dots" aria-hidden>
                <span className="chat-assist__loading-dot" />
                <span className="chat-assist__loading-dot" />
                <span className="chat-assist__loading-dot" />
              </div>
              <p>One moment…</p>
            </div>
          ) : error ? (
            <p className="chat-assist__error" role="alert">
              {error}
            </p>
          ) : displayResult ? (
            <div className="chat-assist__content">
              <article className="chat-assist__mood-card">
                <div className="chat-assist__mood-top">
                  <div className="chat-assist__mood-headings">
                    <p className="chat-assist__mood-label">Conversation mood</p>
                    <span className="chat-assist__mood-badge">{displayResult.moodLabel}</span>
                  </div>
                  <button
                    type="button"
                    className="chat-assist__mood-collapse"
                    onClick={() => setMoodExpanded((v) => !v)}
                    aria-expanded={moodExpanded}
                  >
                    {moodExpanded ? 'Less' : 'More'}
                  </button>
                </div>
                <p className="chat-assist__mood-text">
                  {moodExpanded ? displayResult.moodExplanation : moodPreview}
                </p>
              </article>

              <div className="chat-assist__suggestions">
                <div className="chat-assist__suggestions-head">
                  <p className="chat-assist__section-title">Suggested replies</p>
                  <span className="chat-assist__section-hint">Tap to use</span>
                </div>
                <ul className="chat-assist__chip-list">
                  {displayResult.suggestions.map((suggestion, index) => (
                    <li key={`${suggestion}-${index}`}>
                      <button
                        type="button"
                        className={`chat-assist__chip chat-assist__chip--${index + 1}`}
                        onClick={() => {
                          onPickSuggestion(suggestion);
                          closeAssist();
                        }}
                      >
                        <span className="chat-assist__chip-badge">{index + 1}</span>
                        <span className="chat-assist__chip-text">{suggestion}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="chat-assist__status">Send a message first.</p>
          )}
        </div>
      </ProfileSheet>
    </>
  );
}
