import { AnimatePresence, motion } from 'framer-motion';
import type { TouchEvent, WheelEvent } from 'react';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { useMatchGreetings } from '@/hooks/match/useMatchGreetings';
import type { MatchToastProps } from './MatchToast.types';
import './MatchToast.css';

function MatchHeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="match-toast__heart-icon">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export function MatchToast({ match, onClose, onSendGreeting }: MatchToastProps) {
  const firstName = match?.name?.trim().split(' ')[0] ?? 'there';
  const dualAvatars = Boolean(match?.myAvatar?.trim());
  const suggestions = useMatchGreetings(match?.name ?? '', Boolean(match));
  const subtitle =
    match?.subtitle ??
    (match ? (
      <>
        You and <strong>{match.name}</strong> liked each other
      </>
    ) : null);

  const blockBackgroundScroll = (event: WheelEvent | TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <AppOverlay>
      <AnimatePresence>
        {match && (
          <>
            <motion.div
              className="match-toast__backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onWheel={blockBackgroundScroll}
              onTouchMove={blockBackgroundScroll}
              aria-hidden
            />
            <div
              className="match-toast__center"
              role="presentation"
              onWheel={blockBackgroundScroll}
              onTouchMove={blockBackgroundScroll}
            >
              <motion.div
                className="match-toast"
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="match-toast-title"
              >
                <button
                  type="button"
                  className="match-toast__close"
                  onClick={onClose}
                  aria-label="Close"
                >
                  ×
                </button>

                <div
                  className={`match-toast__hero ${dualAvatars ? 'match-toast__hero--dual' : ''}`}
                >
                  {dualAvatars ? (
                    <>
                      <div className="match-toast__avatar-pair">
                        <div className="match-toast__avatar-slot match-toast__avatar-slot--left">
                          <div className="match-toast__avatar-ring" aria-hidden />
                          <img
                            src={match.myAvatar}
                            alt=""
                            className="match-toast__avatar"
                          />
                        </div>
                        <div className="match-toast__avatar-slot match-toast__avatar-slot--right">
                          <div className="match-toast__avatar-ring" aria-hidden />
                          <img src={match.avatar} alt="" className="match-toast__avatar" />
                        </div>
                      </div>
                      <span className="match-toast__heart-badge match-toast__heart-badge--dual" aria-hidden>
                        <MatchHeartIcon />
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="match-toast__avatar-ring" aria-hidden />
                      <img src={match.avatar} alt="" className="match-toast__avatar" />
                      <span className="match-toast__heart-badge" aria-hidden>
                        <MatchHeartIcon />
                      </span>
                    </>
                  )}
                </div>

                <h3 id="match-toast-title" className="match-toast__title">
                  It&apos;s a match!
                </h3>
                <p className="match-toast__text">{subtitle}</p>

                <div className="match-toast__greetings">
                  <p className="match-toast__greeting-prompt">Say hi to {firstName}</p>
                  <p className="match-toast__greeting-hint">Tap a greeting to send it in Chat</p>
                  <div className="match-toast__suggestions">
                    {suggestions.map((text, index) => (
                      <button
                        key={`${index}-${text}`}
                        type="button"
                        className="match-toast__suggestion"
                        onClick={() => onSendGreeting(text)}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </AppOverlay>
  );
}
