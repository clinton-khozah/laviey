import { useState } from 'react';
import { JoinMeetupConfirmSheet } from '@/components/rooms/JoinMeetupConfirmSheet';
import type { OnlineDate } from '@/types';
import './LiveMeetupsStrip.css';

interface LiveMeetupsStripProps {
  dates: OnlineDate[];
  joiningId: string | null;
  onJoin: (date: OnlineDate) => void;
}

function hostInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

function shortName(date: OnlineDate): string {
  if (date.isHostedByYou) return 'You';
  const first = date.hostName.trim().split(/\s+/)[0] ?? date.hostName;
  return first.length > 9 ? `${first.slice(0, 8)}…` : first;
}

export function LiveMeetupsStrip({ dates, joiningId, onJoin }: LiveMeetupsStripProps) {
  const [confirmDate, setConfirmDate] = useState<OnlineDate | null>(null);

  if (dates.length === 0) return null;

  const handleConfirm = () => {
    if (!confirmDate || joiningId) return;
    onJoin(confirmDate);
    setConfirmDate(null);
  };

  return (
    <>
      <section className="live-meetups-strip" aria-label="Live meetups">
        <div className="live-meetups-strip__head">
          <span className="live-meetups-strip__live-dot" aria-hidden />
          <h2 className="live-meetups-strip__title">Live now</h2>
          <span className="live-meetups-strip__hint">Swipe</span>
        </div>

        <div className="live-meetups-strip__scroll" role="list">
          {dates.map((date) => {
            const isJoining = joiningId === date.id;

            return (
              <div key={date.id} className="live-meetups-strip__item" role="listitem">
                <button
                  type="button"
                  className={`live-meetups-strip__story ${isJoining ? 'live-meetups-strip__story--busy' : ''}`}
                  onClick={() => !joiningId && setConfirmDate(date)}
                  disabled={Boolean(joiningId)}
                  aria-label={`Join live meetup: ${date.title} with ${date.hostName}`}
                >
                  <span className="live-meetups-strip__ring" aria-hidden>
                    {date.hostAvatar ? (
                      <img src={date.hostAvatar} alt="" className="live-meetups-strip__avatar" />
                    ) : (
                      <span className="live-meetups-strip__avatar live-meetups-strip__avatar--initial">
                        {hostInitial(date.hostName)}
                      </span>
                    )}
                  </span>
                  <span className="live-meetups-strip__live-badge">Live</span>
                </button>
                <span className="live-meetups-strip__name">{shortName(date)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <JoinMeetupConfirmSheet
        open={confirmDate !== null}
        date={confirmDate}
        isJoining={Boolean(confirmDate && joiningId === confirmDate.id)}
        onClose={() => setConfirmDate(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
