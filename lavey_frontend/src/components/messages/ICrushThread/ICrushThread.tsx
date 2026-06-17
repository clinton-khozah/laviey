import { useState } from 'react';
import { FeedProfileAvatar } from '@/components/feed/FeedProfileAvatar';
import { hasCustomProfileAvatar } from '@/utils/discover/discoverProfileReady';
import { isICrushIncoming } from '@/utils/messages/iCrushConversation';
import type { Conversation } from '@/types';
import './ICrushThread.css';

interface ICrushThreadProps {
  conversation: Conversation;
  isResponding: boolean;
  onBack: () => void;
  onProfileClick: () => void;
  onAccept: () => void;
  onReject: () => void;
}

export function ICrushThread({
  conversation,
  isResponding,
  onBack,
  onProfileClick,
  onAccept,
  onReject,
}: ICrushThreadProps) {
  const [confirmReject, setConfirmReject] = useState(false);
  const incoming = isICrushIncoming(conversation);
  const avatarSrc = hasCustomProfileAvatar(conversation.participantAvatar)
    ? conversation.participantAvatar
    : undefined;
  const firstName = conversation.participantName.split(' ')[0] || conversation.participantName;

  return (
    <section className="icrush-thread" aria-label="Crushy conversation">
      <div className="icrush-thread__backdrop" aria-hidden>
        <span className="icrush-thread__glow icrush-thread__glow--top" />
        <span className="icrush-thread__glow icrush-thread__glow--mid" />
        <span className="icrush-thread__glow icrush-thread__glow--bottom" />
        <span className="icrush-thread__veil" />
      </div>

      <header className="icrush-thread__header">
        <button type="button" className="icrush-thread__back" onClick={onBack} aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          className="icrush-thread__profile"
          onClick={onProfileClick}
          aria-label={`View ${conversation.participantName}'s profile`}
        >
          <FeedProfileAvatar
            name={conversation.participantName}
            src={avatarSrc}
            size="sm"
            className="icrush-thread__avatar"
          />
          <span className="icrush-thread__status">crushy · view profile</span>
        </button>
      </header>

      <main className="icrush-thread__main">
        <article className="icrush-thread__panel">
          <div className="icrush-thread__badge" aria-hidden>
            <span className="icrush-thread__emoji">💋</span>
          </div>

          <h2 className="icrush-thread__title">
            {incoming
              ? `${firstName} sent you a crushy`
              : `Your crushy is on the way to ${firstName}`}
          </h2>

          <p className="icrush-thread__lead">
            {incoming
              ? 'They picked you on For You. Even on free, you can see who it is and choose to chat or pass.'
              : 'If they accept, you will match and can start chatting right away. No need for them to like you back first.'}
          </p>

          {incoming ? (
            <div className="icrush-thread__actions">
              {!confirmReject ? (
                <>
                  <button
                    type="button"
                    className="icrush-thread__btn icrush-thread__btn--accept"
                    onClick={onAccept}
                    disabled={isResponding}
                  >
                    {isResponding ? 'Matching…' : 'Accept & chat'}
                  </button>
                  <button
                    type="button"
                    className="icrush-thread__btn icrush-thread__btn--reject"
                    onClick={() => setConfirmReject(true)}
                    disabled={isResponding}
                  >
                    Not now
                  </button>
                </>
              ) : (
                <>
                  <p className="icrush-thread__confirm">Pass on this crushy?</p>
                  <button
                    type="button"
                    className="icrush-thread__btn icrush-thread__btn--reject"
                    onClick={onReject}
                    disabled={isResponding}
                  >
                    {isResponding ? 'Passing…' : 'Yes, pass'}
                  </button>
                  <button
                    type="button"
                    className="icrush-thread__btn icrush-thread__btn--ghost"
                    onClick={() => setConfirmReject(false)}
                    disabled={isResponding}
                  >
                    Keep thinking
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="icrush-thread__status-block">
              <div className="icrush-thread__status-row">
                <span className="icrush-thread__pulse" aria-hidden />
                <p className="icrush-thread__status-label">Waiting for a reply</p>
              </div>
              <p className="icrush-thread__status-note">
                You will get a match notification as soon as {firstName} accepts.
              </p>
            </div>
          )}
        </article>
      </main>
    </section>
  );
}
