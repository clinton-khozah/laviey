import { useCallback, useMemo, useState } from 'react';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { MeetingCaptions } from '@/components/rooms/MeetingCaptions';
import { GiftIcon, MeetingGiftPanel } from '@/components/rooms/MeetingGiftPanel';
import { meetingString } from '@/constants/meeting/meetingStrings';
import { useLocalMedia, useMeetingCaptions, useMeetingGift, useMeetingLanguage } from '@/hooks';
import { isDoubleDateMeetup } from '@/utils/meeting/isDoubleDateMeetup';
import type { VideoMeetingRoomProps } from './VideoMeetingRoom.types';
import './VideoMeetingRoom.css';

export function VideoMeetingRoom({ session, participants, onLeave }: VideoMeetingRoomProps) {
  const { date, localDisplayName } = session;
  const isDouble = isDoubleDateMeetup(date);
  const { language, setLanguage } = useMeetingLanguage();
  const {
    videoRef,
    error: mediaError,
    isLoading: mediaLoading,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    stopMedia,
  } = useLocalMedia(true);

  const { line, displayText, captionsEnabled, toggleCaptions } = useMeetingCaptions(true, language);
  const [giftOpen, setGiftOpen] = useState(false);

  const giftRecipient = useMemo(() => {
    if (date.isHostedByYou) {
      if (isDouble && participants.length > 1) return participants[1];
      return null;
    }
    return participants[0] ?? null;
  }, [date.isHostedByYou, isDouble, participants]);

  const {
    amount: giftAmount,
    setAmount: setGiftAmount,
    sendGift,
    bursts: giftBursts,
    sessionTotal: giftSessionTotal,
    isSending: giftSending,
  } = useMeetingGift({
    recipientId: giftRecipient?.profileId ?? '',
    recipientName: giftRecipient?.name ?? '',
    meetupId: date.id,
  });

  const t = useCallback(
    (key: Parameters<typeof meetingString>[0], vars?: Record<string, string>) =>
      meetingString(key, language, vars),
    [language],
  );

  const participantTotal = participants.length + 1;

  const gridClass = useMemo(() => {
    if (participants.length <= 1) return 'video-meeting__grid--solo';
    return 'video-meeting__grid--double';
  }, [participants.length]);

  const meetTypeLabel = isDouble ? t('doubleDate') : t('oneOnOne');

  const subtitle = date.isHostedByYou
    ? `${t('youAreHosting')} · ${meetTypeLabel}`
    : `${t('withHost', { name: date.hostName })} · ${meetTypeLabel} · ${participantTotal}/${date.maxParticipants}`;

  const handleLeave = () => {
    stopMedia();
    onLeave();
  };

  return (
    <AppOverlay>
      <div className="video-meeting">
        <MeetingCaptions
          line={line}
          displayText={displayText}
          language={language}
          captionsEnabled={captionsEnabled}
          onToggleCaptions={toggleCaptions}
          onLanguageChange={setLanguage}
          t={t}
        />

        <header className="video-meeting__header">
          <button
            type="button"
            className="video-meeting__back"
            onClick={handleLeave}
            aria-label={t('leaveMeetup')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="video-meeting__header-text">
            <div className="video-meeting__title-row">
              <h1 className="video-meeting__title">{date.title}</h1>
              <span className="video-meeting__live">{t('live')}</span>
            </div>
            <p className="video-meeting__subtitle">{subtitle}</p>
          </div>
          <span className="video-meeting__header-spacer" aria-hidden />
        </header>

        <div className="video-meeting__stage">
          {participants.length === 1 && !isDouble && (
            <div className="video-meeting__love-badge" aria-hidden>
              <span className="video-meeting__love-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </span>
              <span className="video-meeting__love-label">Lovely date</span>
            </div>
          )}
          <div className={`video-meeting__grid ${gridClass}`}>
            {participants.map((p) => (
              <article key={p.id} className="video-meeting__tile">
                {p.isVideoOff ? (
                  <div className="video-meeting__tile-placeholder">
                    <img src={p.avatarUrl} alt="" className="video-meeting__tile-avatar" />
                  </div>
                ) : (
                  <div
                    className="video-meeting__tile-cover"
                    style={{ backgroundImage: `url(${p.avatarUrl})` }}
                  >
                    {participants.length === 1 && !isDouble && (
                      <span className="video-meeting__tile-heart" aria-hidden>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      </span>
                    )}
                  </div>
                )}
                <div className="video-meeting__tile-footer">
                  <span className="video-meeting__tile-name">
                    {p.name}
                    {p.isHost && (
                      <span className="video-meeting__host-tag">{t('host')}</span>
                    )}
                  </span>
                  <span className="video-meeting__tile-status" aria-hidden>
                    {p.isMuted ? '🔇' : ''}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="video-meeting__self">
          <div className="video-meeting__self-frame">
            {mediaLoading && (
              <div className="video-meeting__self-loading">
                <span className="video-meeting__spinner" aria-hidden />
              </div>
            )}
            {mediaError && !mediaLoading && (
              <div className="video-meeting__self-error">
                <p>{mediaError}</p>
              </div>
            )}
            {!mediaError && (
              <video
                ref={videoRef}
                className={`video-meeting__self-video ${!isVideoEnabled ? 'video-meeting__self-video--off' : ''}`}
                autoPlay
                playsInline
                muted
              />
            )}
            {!isVideoEnabled && !mediaLoading && !mediaError && (
              <div className="video-meeting__self-off">
                <span>{localDisplayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          <span className="video-meeting__self-label">{t('you')}</span>
        </div>

        {giftRecipient && (
          <MeetingGiftPanel
            open={giftOpen}
            recipientName={giftRecipient.name}
            amount={giftAmount}
            sessionTotal={giftSessionTotal}
            isSending={giftSending}
            bursts={giftBursts}
            onClose={() => setGiftOpen(false)}
            onAmountChange={setGiftAmount}
            onSendGift={() => void sendGift()}
          />
        )}

        <footer className="video-meeting__controls">
          <button
            type="button"
            className={`video-meeting__control ${!isAudioEnabled ? 'video-meeting__control--off' : ''}`}
            onClick={toggleAudio}
            aria-label={isAudioEnabled ? t('muteMic') : t('unmuteMic')}
            aria-pressed={!isAudioEnabled}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {isAudioEnabled ? (
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
              ) : (
                <path d="M1 1l22 22M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6M12 19v4M8 23h8" />
              )}
            </svg>
          </button>
          <button
            type="button"
            className={`video-meeting__control ${!isVideoEnabled ? 'video-meeting__control--off' : ''}`}
            onClick={toggleVideo}
            aria-label={isVideoEnabled ? t('cameraOff') : t('cameraOn')}
            aria-pressed={!isVideoEnabled}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          {giftRecipient && (
            <button
              type="button"
              className={`video-meeting__control video-meeting__control--gift ${giftOpen ? 'video-meeting__control--gift-open' : ''}`}
              onClick={() => {
                if (giftOpen) void sendGift();
                else setGiftOpen(true);
              }}
              aria-label={giftOpen ? `Send $${giftAmount} gift` : 'Open gift panel'}
            >
              <GiftIcon />
            </button>
          )}
          <button
            type="button"
            className="video-meeting__control video-meeting__control--leave"
            onClick={handleLeave}
          >
            {t('leave')}
          </button>
        </footer>
      </div>
    </AppOverlay>
  );
}
