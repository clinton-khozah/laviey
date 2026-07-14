import { useEffect } from 'react';
import { AppOverlay } from '@/components/ui/AppOverlay';
import type { ChatVideoCall } from '@/types';
import { startCallRingtone } from '@/utils/audio/callRingtone';
import './IncomingVideoCall.css';

interface IncomingVideoCallProps {
  call: ChatVideoCall;
  busy?: boolean;
  onAnswer: () => void;
  onDecline: () => void;
}

export function IncomingVideoCall({
  call,
  busy = false,
  onAnswer,
  onDecline,
}: IncomingVideoCallProps) {
  useEffect(() => startCallRingtone('incoming'), [call.id]);

  return (
    <AppOverlay>
      <section className="incoming-video-call" role="dialog" aria-modal="true" aria-label="Incoming video call">
        <div className="incoming-video-call__pulse" aria-hidden />
        {call.participantAvatar ? (
          <img className="incoming-video-call__avatar" src={call.participantAvatar} alt="" />
        ) : (
          <span className="incoming-video-call__avatar incoming-video-call__avatar--fallback" aria-hidden>
            {call.participantName.charAt(0).toUpperCase()}
          </span>
        )}
        <p className="incoming-video-call__eyebrow">Incoming video call</p>
        <h2>{call.participantName}</h2>
        <p className="incoming-video-call__hint">Lavey private call</p>
        <div className="incoming-video-call__actions">
          <button type="button" className="incoming-video-call__button incoming-video-call__button--decline" onClick={onDecline} disabled={busy}>
            <span aria-hidden>×</span>
            Decline
          </button>
          <button type="button" className="incoming-video-call__button incoming-video-call__button--answer" onClick={onAnswer} disabled={busy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 10l4.6-2.3A1 1 0 0121 8.6v6.8a1 1 0 01-1.4.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Answer
          </button>
        </div>
      </section>
    </AppOverlay>
  );
}
