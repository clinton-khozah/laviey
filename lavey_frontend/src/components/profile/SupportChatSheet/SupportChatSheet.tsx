import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { PageScroller } from '@/components/layout/PageScroller';
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
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const config = conversation?.config;
  const messages = conversation?.messages ?? [];
  const displayName = config?.displayName ?? 'Lavey Support';
  const statusText = config?.statusText ?? "We're here to help";
  const quickTopics = config?.quickTopics ?? [];
  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || 'L';

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
            <span className="support-chat__avatar" aria-hidden>
              {avatarLetter}
            </span>
            <div className="support-chat__profile-text">
              <span className="support-chat__name">{displayName}</span>
              <span className="support-chat__status">{statusText}</span>
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
