import { useEffect, useRef, useState } from 'react';
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

function stripBadge(date: OnlineDate): { label: string; variant: 'live' | 'soon' | 'later' } {
  if (date.status === 'live') {
    return { label: 'Live', variant: 'live' };
  }
  if (date.status === 'starting-soon') {
    return { label: 'Coming soon', variant: 'soon' };
  }
  return { label: 'Later', variant: 'later' };
}

function stripAriaLabel(date: OnlineDate): string {
  const badge = stripBadge(date);
  if (badge.variant === 'live') {
    return `Join live meetup: ${date.title} with ${date.hostName}`;
  }
  if (badge.variant === 'soon') {
    return `Coming soon: ${date.title} with ${date.hostName}`;
  }
  return `Scheduled meetup: ${date.title} with ${date.hostName}`;
}

export function LiveMeetupsStrip({ dates, joiningId, onJoin }: LiveMeetupsStripProps) {
  const [confirmDate, setConfirmDate] = useState<OnlineDate | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fitsScreen, setFitsScreen] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkFit = () => {
      setFitsScreen(el.scrollWidth <= el.clientWidth + 1);
    };

    checkFit();
    const observer = new ResizeObserver(checkFit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [dates.length]);

  if (dates.length === 0) return null;

  const handleConfirm = () => {
    if (!confirmDate || joiningId) return;
    onJoin(confirmDate);
    setConfirmDate(null);
  };

  return (
    <>
      <section className="live-meetups-strip" aria-label="Live and upcoming meetups">
        <div
          ref={scrollRef}
          className={`live-meetups-strip__scroll${fitsScreen ? ' live-meetups-strip__scroll--centered' : ''}`}
          role="list"
        >
          {dates.map((date) => {
            const isJoining = joiningId === date.id;
            const badge = stripBadge(date);
            const isLive = badge.variant === 'live';

            return (
              <div key={date.id} className="live-meetups-strip__item" role="listitem">
                <button
                  type="button"
                  className={`live-meetups-strip__story ${isJoining ? 'live-meetups-strip__story--busy' : ''}`}
                  onClick={() => !joiningId && setConfirmDate(date)}
                  disabled={Boolean(joiningId)}
                  aria-label={stripAriaLabel(date)}
                >
                  <span
                    className={`live-meetups-strip__ring ${isLive ? '' : 'live-meetups-strip__ring--upcoming'}`}
                    aria-hidden
                  >
                    {date.hostAvatar ? (
                      <img src={date.hostAvatar} alt="" className="live-meetups-strip__avatar" />
                    ) : (
                      <span className="live-meetups-strip__avatar live-meetups-strip__avatar--initial">
                        {hostInitial(date.hostName)}
                      </span>
                    )}
                  </span>
                  <span
                    className={`live-meetups-strip__badge live-meetups-strip__badge--${badge.variant}`}
                    title={badge.variant === 'soon' ? 'Coming soon' : undefined}
                  >
                    {badge.label}
                  </span>
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
