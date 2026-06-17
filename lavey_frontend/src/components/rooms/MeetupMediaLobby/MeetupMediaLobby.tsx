import { AppOverlay } from '@/components/ui/AppOverlay';
import type { ActiveMeetingSession } from '@/types';
import './MeetupMediaLobby.css';

interface MeetupMediaLobbyProps {
  session: ActiveMeetingSession;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onLeave: () => void;
}

export function MeetupMediaLobby({
  session,
  isLoading,
  error,
  onRetry,
  onLeave,
}: MeetupMediaLobbyProps) {
  const { date } = session;

  return (
    <AppOverlay>
      <div className="meetup-media-lobby">
        <button type="button" className="meetup-media-lobby__back" onClick={onLeave} aria-label="Leave">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="meetup-media-lobby__card">
          <span className="meetup-media-lobby__icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2" />
            </svg>
          </span>

          <h1 className="meetup-media-lobby__title">Camera &amp; microphone</h1>
          <p className="meetup-media-lobby__meetup">{date.title}</p>
          <p className="meetup-media-lobby__hint">
            {isLoading && !error
              ? 'When your browser asks, tap Allow so others can see and hear you in this meetup.'
              : error
                ? error
                : 'Allow camera and microphone access to join the video meetup.'}
          </p>

          {isLoading && !error ? (
            <div className="meetup-media-lobby__loading" aria-busy="true">
              <span className="meetup-media-lobby__spinner" aria-hidden />
              <span>Waiting for permission…</span>
            </div>
          ) : null}

          {error ? (
            <button type="button" className="meetup-media-lobby__retry" onClick={onRetry}>
              Allow camera &amp; microphone
            </button>
          ) : null}

          <button type="button" className="meetup-media-lobby__leave" onClick={onLeave}>
            Cancel
          </button>
        </div>
      </div>
    </AppOverlay>
  );
}
