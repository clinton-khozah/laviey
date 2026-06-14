import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { MeetingChatPanel } from '@/components/rooms/MeetingChatPanel';
import { MeetingGiftRecipientSheet } from '@/components/rooms/MeetingGiftRecipientSheet';
import { MeetingLiveTranscriptModal } from '@/components/rooms/MeetingLiveTranscriptModal';
import { MeetingReactionOverlay } from '@/components/rooms/MeetingReactionOverlay';
import { MeetingSelfVideo } from '@/components/rooms/MeetingSelfVideo';
import { RemoteParticipantVideo } from '@/components/rooms/RemoteParticipantVideo';
import { MeetingCaptions } from '@/components/rooms/MeetingCaptions';
import { MeetingGiftBursts } from '@/components/rooms/MeetingGiftPanel/MeetingGiftBursts';
import { GiftIcon, MeetingGiftPanel } from '@/components/rooms/MeetingGiftPanel';
import { MEETING_REACTION_LABEL } from '@/constants/meeting/meetingReactions';
import { meetingString } from '@/constants/meeting/meetingStrings';
import type { MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';
import {
  useMeetingChat,
  useMeetingGift,
  useMeetingLanguage,
  useMeetingLiveTranscript,
  useMeetingReactions,
} from '@/hooks';
import { isDoubleDateMeetup } from '@/utils/meeting/isDoubleDateMeetup';
import { hasMeetupCover, resolveMeetupCover } from '@/utils/meeting/meetupCover';
import type { MeetingParticipant } from '@/types';
import type { VideoMeetingRoomProps } from './VideoMeetingRoom.types';
import './VideoMeetingRoom.css';

export function VideoMeetingRoom({
  session,
  participants,
  localMedia,
  connectionStatus = 'connecting',
  localUserId,
  onLeave,
}: VideoMeetingRoomProps) {
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
  } = localMedia;

  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const meetingRef = useRef<HTMLDivElement>(null);

  const {
    entries: transcriptEntries,
    latestEntry,
    latestDisplayText,
    isListening,
    isProcessing,
    error: transcriptError,
    clearEntries,
    formatTime,
  } = useMeetingLiveTranscript({
    enabled: captionsEnabled,
    targetLanguage: language,
    localStream: localMedia.localStream,
    participants,
  });

  const toggleCaptions = useCallback(() => {
    setCaptionsEnabled((value) => !value);
  }, []);

  const openTranscript = useCallback(() => {
    setTranscriptOpen(true);
    setCaptionsEnabled(true);
  }, []);

  const showTranslationNote = Boolean(
    latestEntry &&
      latestEntry.detectedLanguage !== 'unknown' &&
      latestEntry.detectedLanguage !== language,
  );

  const { bursts: reactionBursts, sendReaction } = useMeetingReactions({
    meetupId: date.id,
    localUserId,
    localDisplayName,
  });

  const localAvatarUrl =
    participants.find((participant) => participant.profileId === localUserId)?.avatarUrl ?? '';

  const { messages: chatMessages, sendMessage, setOnIncomingMessage } = useMeetingChat({
    meetupId: date.id,
    localUserId,
    localDisplayName,
    localAvatarUrl,
  });

  const [chatOpen, setChatOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftRecipientPickerOpen, setGiftRecipientPickerOpen] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState<MeetingParticipant | null>(null);

  const giftableParticipants = useMemo(
    () => participants.filter((participant) => participant.profileId !== localUserId),
    [localUserId, participants],
  );

  const {
    amount: giftAmount,
    setAmount: setGiftAmount,
    sendGift,
    bursts: giftBursts,
    sessionTotal: giftSessionTotal,
    isSending: giftSending,
  } = useMeetingGift({ meetupId: date.id });

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

  const openGiftForRecipient = (participant: MeetingParticipant) => {
    setGiftRecipient(participant);
    setGiftRecipientPickerOpen(false);
    setGiftOpen(true);
  };

  const handleGiftButtonClick = () => {
    if (giftableParticipants.length === 0) return;
    if (giftableParticipants.length === 1) {
      openGiftForRecipient(giftableParticipants[0]);
      return;
    }
    setGiftRecipientPickerOpen(true);
  };

  const closeGiftPanel = () => {
    setGiftOpen(false);
    setGiftRecipient(null);
  };

  useEffect(() => {
    setOnIncomingMessage((message) => {
      if (message.isLocal || chatOpen) return;
      setChatUnread((count) => count + 1);
    });
    return () => setOnIncomingMessage(null);
  }, [chatOpen, setOnIncomingMessage]);

  const openChat = () => {
    setChatOpen(true);
    setChatUnread(0);
  };

  const meetingCover = resolveMeetupCover(date.coverImage);
  const showMeetingCover = hasMeetupCover(date.coverImage);

  return (
    <AppOverlay>
      <div className="video-meeting" ref={meetingRef}>
        <MeetingReactionOverlay bursts={reactionBursts} />

        <MeetingCaptions
          displayText={latestDisplayText}
          showTranslationNote={showTranslationNote}
          sourceLanguage={
            latestEntry?.detectedLanguage && latestEntry.detectedLanguage !== 'unknown'
              ? (latestEntry.detectedLanguage as MeetingLanguageCode)
              : undefined
          }
          language={language}
          captionsEnabled={captionsEnabled}
          transcriptOpen={transcriptOpen}
          onToggleCaptions={toggleCaptions}
          onOpenTranscript={openTranscript}
          onLanguageChange={setLanguage}
          t={t}
        />

        <MeetingLiveTranscriptModal
          open={transcriptOpen}
          entries={transcriptEntries}
          targetLanguage={language}
          isListening={isListening}
          isProcessing={isProcessing}
          error={transcriptError}
          onClose={() => setTranscriptOpen(false)}
          onLanguageChange={setLanguage}
          onClear={clearEntries}
          formatTime={formatTime}
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
            <p className="video-meeting__subtitle">
              {subtitle}
              {connectionStatus === 'unsupported' && ' · Video link unavailable — refresh after signing in'}
              {connectionStatus === 'connecting' && participants.length === 0 && ' · Waiting for others…'}
            </p>
          </div>
          <span className="video-meeting__header-spacer" aria-hidden />
        </header>

        <div
          className={`video-meeting__stage ${showMeetingCover ? 'video-meeting__stage--has-cover' : ''}`}
          style={
            showMeetingCover && meetingCover
              ? ({ '--meeting-cover-image': `url("${meetingCover}")` } as React.CSSProperties)
              : undefined
          }
        >
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
            {participants.length === 0 && connectionStatus !== 'unsupported' && (
              <article className="video-meeting__tile video-meeting__tile--waiting">
                <div className="video-meeting__tile-placeholder">
                  <span className="video-meeting__spinner" aria-hidden />
                  <p className="video-meeting__tile-waiting-text">Waiting for someone to join…</p>
                </div>
              </article>
            )}
            {participants.map((p) => (
              <article key={p.id} className="video-meeting__tile">
                {p.stream && !p.isVideoOff ? (
                  <RemoteParticipantVideo stream={p.stream} className="video-meeting__tile-video" />
                ) : (
                  <div className="video-meeting__tile-placeholder">
                    <img src={p.avatarUrl} alt="" className="video-meeting__tile-avatar" />
                    {p.isConnecting && (
                      <span className="video-meeting__tile-connecting">Connecting…</span>
                    )}
                  </div>
                )}
                <div className="video-meeting__tile-footer">
                  <span className="video-meeting__tile-name">
                    {p.name}
                    {p.isHost && <span className="video-meeting__host-tag">{t('host')}</span>}
                  </span>
                  <span className="video-meeting__tile-status" aria-hidden>
                    {p.isMuted ? '🔇' : ''}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <MeetingSelfVideo
          boundsRef={meetingRef}
          videoRef={videoRef}
          displayName={localDisplayName}
          isVideoEnabled={isVideoEnabled}
          mediaLoading={mediaLoading}
          mediaError={mediaError}
          youLabel={t('you')}
        />

        <MeetingChatPanel
          open={chatOpen}
          messages={chatMessages}
          localUserId={localUserId}
          onClose={() => setChatOpen(false)}
          onSendMessage={sendMessage}
          onSendReaction={sendReaction}
        />

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

          <div className="video-meeting__control-wrap">
            <button
              type="button"
              className={`video-meeting__control ${chatOpen ? 'video-meeting__control--chat-open' : ''}`}
              onClick={() => (chatOpen ? setChatOpen(false) : openChat())}
              aria-label={chatOpen ? 'Close chat' : 'Open chat'}
              aria-pressed={chatOpen}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </button>
            {!chatOpen && chatUnread > 0 && (
              <span className="video-meeting__control-badge" aria-label={`${chatUnread} unread messages`}>
                {chatUnread > 9 ? '9+' : chatUnread}
              </span>
            )}
          </div>

          <button
            type="button"
            className="video-meeting__control video-meeting__control--reaction"
            onClick={() => sendReaction('like')}
            aria-label={MEETING_REACTION_LABEL.like}
          >
            ❤️
          </button>
          <button
            type="button"
            className="video-meeting__control video-meeting__control--reaction"
            onClick={() => sendReaction('live')}
            aria-label={MEETING_REACTION_LABEL.live}
          >
            🔥
          </button>
          <button
            type="button"
            className="video-meeting__control video-meeting__control--reaction"
            onClick={() => sendReaction('love')}
            aria-label={MEETING_REACTION_LABEL.love}
          >
            💕
          </button>

          {giftableParticipants.length > 0 && (
            <button
              type="button"
              className={`video-meeting__control video-meeting__control--gift ${giftOpen ? 'video-meeting__control--gift-open' : ''}`}
              onClick={handleGiftButtonClick}
              aria-label={
                giftOpen && giftRecipient
                  ? `Send $${giftAmount} gift to ${giftRecipient.name}`
                  : 'Send a gift'
              }
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

      <MeetingGiftBursts bursts={giftBursts} />

      <div className="meeting-gift-layer">
        <MeetingGiftRecipientSheet
          open={giftRecipientPickerOpen}
          participants={giftableParticipants}
          onClose={() => setGiftRecipientPickerOpen(false)}
          onSelect={openGiftForRecipient}
        />

        {giftRecipient && (
          <MeetingGiftPanel
            open={giftOpen}
            recipientName={giftRecipient.name}
            amount={giftAmount}
            sessionTotal={giftSessionTotal}
            isSending={giftSending}
            onClose={closeGiftPanel}
            onAmountChange={setGiftAmount}
            onSendGift={() =>
              void sendGift({ id: giftRecipient.profileId, name: giftRecipient.name })
            }
          />
        )}
      </div>
    </AppOverlay>
  );
}
