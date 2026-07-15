import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { PageScroller } from '@/components/layout/PageScroller';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { APP_IMAGES } from '@/constants/images';
import {
  supportService,
  type SupportConversation,
  type SupportMessage,
} from '@/services/support/supportService';
import { getUserFacingErrorMessage } from '@/utils/errors/userFacingErrorMessage';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import './SupportChatSheet.css';

const POLL_MS = 12_000;

interface SupportChatSheetProps {
  open: boolean;
  onClose: () => void;
}

export function SupportChatSheet({ open, onClose }: SupportChatSheetProps) {
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const config = conversation?.config;
  const messages = conversation?.messages ?? [];
  const displayName = config?.displayName ?? 'Lavey Support';
  const statusText = config?.statusText ?? 'AI help · Consultants available';
  const quickTopics = config?.quickTopics ?? [];
  const supportMode = conversation?.supportMode ?? 'ai';

  const loadConversation = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await supportService.getConversation();
      setConversation(data);
      setError(null);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, 'Could not load support chat.'));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraft('');
    setError(null);
    void loadConversation();
  }, [open, loadConversation]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => {
      void loadConversation(true);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [open, loadConversation]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open, isSending, isLoading]);

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setError(null);
    try {
      const updated = await supportService.sendMessage(trimmed);
      setConversation(updated);
      setDraft('');
    } catch (err) {
      setError(getUserFacingErrorMessage(err, 'Could not send message.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendText(draft);
  };

  const handleConsultantRequest = async () => {
    if (isEscalating || supportMode === 'consultant') return;
    setIsEscalating(true);
    setError(null);
    try {
      const updated = await supportService.requestConsultant();
      setConversation(updated);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, 'Could not request a consultant.'));
    } finally {
      setIsEscalating(false);
    }
  };

  if (!open) return null;

  return (
    <AppOverlay>
      <div className="support-chat">
        <header className="support-chat__header">
          <button type="button" className="support-chat__back" onClick={onClose} aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="support-chat__profile">
            <span className="support-chat__avatar">
              <img src={APP_IMAGES.logo} alt="Lavey" className="support-chat__avatar-logo" />
              <VerifiedBadge
                size="sm"
                ring
                className="support-chat__verified"
                title="Verified Lavey Support"
              />
            </span>
            <div className="support-chat__profile-text">
              <span className="support-chat__name">{displayName}</span>
              <span className="support-chat__status">
                {supportMode === 'consultant' ? 'A consultant will reply soon' : statusText}
              </span>
            </div>
          </div>
        </header>

        {error && <p className="support-chat__error">{error}</p>}

        <PageScroller className="support-chat__scroll">
          <div className="support-chat__messages">
            {isLoading && messages.length === 0 ? (
              <PageTransitionSplash />
            ) : (
              messages.map((msg: SupportMessage) => (
                <div
                  key={msg.id}
                  className={`support-chat__bubble-wrap support-chat__bubble-wrap--${msg.sender}`}
                >
                  <div
                    className={`support-chat__bubble support-chat__bubble--${msg.sender} ${msg.isAutoReply ? 'support-chat__bubble--auto' : ''}`}
                  >
                    {msg.isAi && (
                      <span className="support-chat__ai-label">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2zm7 12l.9 2.6L22.5 18l-2.6.9L19 21.5l-.9-2.6-2.6-.9 2.6-.9L19 14z" />
                        </svg>
                        Lavey AI
                      </span>
                    )}
                    <p>{msg.text}</p>
                    <span className="support-chat__time">{msg.sentAt}</span>
                  </div>
                </div>
              ))
            )}
            {isSending && (
              <div className="support-chat__typing" aria-live="polite">
                <span />
                <span />
                <span />
              </div>
            )}
            <div ref={bottomRef} className="support-chat__scroll-anchor" aria-hidden />
          </div>
        </PageScroller>

        <div className="support-chat__bottom">
          {quickTopics.length > 0 && (
            <div className="support-chat__quick" role="group" aria-label="Quick topics">
              <p className="support-chat__quick-label">Quick topics</p>
              <div className="support-chat__quick-row">
                {quickTopics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    className="support-chat__quick-btn"
                    disabled={isSending || isLoading}
                    onClick={() => void sendText(topic)}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="support-chat__handoff">
            {supportMode === 'consultant' ? (
              <div className="support-chat__consultant-status" role="status">
                <span className="support-chat__consultant-dot" aria-hidden />
                Consultant requested · Your conversation is saved
              </div>
            ) : (
              <button
                type="button"
                className="support-chat__consultant-btn"
                disabled={isSending || isLoading || isEscalating}
                onClick={() => void handleConsultantRequest()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M4 13v-2a8 8 0 0116 0v2" />
                  <path d="M4 13a2 2 0 012-2h1v6H6a2 2 0 01-2-2v-2zm16 0a2 2 0 00-2-2h-1v6h1a2 2 0 002-2v-2z" />
                  <path d="M17 18c-1 2-2.7 3-5 3" />
                </svg>
                {isEscalating ? 'Connecting…' : 'Talk to a consultant'}
              </button>
            )}
          </div>

          <footer className="support-chat__footer">
            <form className="support-chat__composer" onSubmit={handleSubmit}>
              <input
                type="text"
                className="support-chat__input"
                placeholder={`Message ${displayName}…`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={isSending || isLoading}
              />
              <button
                type="submit"
                className="support-chat__send"
                disabled={isSending || isLoading || !draft.trim()}
                aria-label="Send"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </footer>
        </div>
      </div>
    </AppOverlay>
  );
}
