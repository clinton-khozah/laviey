import { useCallback, useEffect, useState } from 'react';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { PageScroller } from '@/components/layout/PageScroller';
import { CreateDateSheet } from '@/components/rooms/CreateDateSheet';
import { DateInviteCard } from '@/components/rooms/DateInviteCard';
import { JoinDateModal } from '@/components/rooms/JoinDateModal';
import { MeetupShareSheet } from '@/components/rooms/MeetupShareSheet';
import { LiveMeetupsStrip } from '@/components/rooms/LiveMeetupsStrip';
import { MeetupVerticalFeed } from '@/components/rooms/MeetupVerticalFeed';
import { OnlineDateCard } from '@/components/rooms/OnlineDateCard';
import { FeedState } from '@/components/ui/FeedState';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { MatchProfileModal } from '@/components/messages/MatchProfileModal';
import { ActiveMeetingContainer } from '@/features/rooms/containers/ActiveMeetingContainer';
import { useMatchActions, useMatchProfile, useOnlineDates, useUserProfile } from '@/hooks';
import { messageService } from '@/services';
import type { ActiveMeetingSession, OnlineDate } from '@/types';
import { meetupRequiresAccessCode } from '@/utils/meeting/meetupJoinAccess';
import { consumePendingMeetupCode } from '@/utils/meeting/meetupJoinLink';
import './ZoomPage.css';

export function ZoomPage() {
  const {
    dates,
    invites,
    acceptedDateIds,
    isLoading,
    error,
    actionError,
    joiningId,
    deletingId,
    refetch,
    joinDate,
    joinByCode,
    createDate,
    deleteDate,
    respondToInvite,
    clearActionError,
  } = useOnlineDates();
  const { profile: userProfile } = useUserProfile();
  const { likedIds, sendFlame, isSubmitting: isFlameSubmitting } = useMatchActions();

  const [createOpen, setCreateOpen] = useState(false);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const {
    profile: profileModal,
    isLoading: profileModalLoading,
    error: profileModalError,
  } = useMatchProfile(profileModalUserId);
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeetingSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState<OnlineDate | null>(null);
  const [joinInitialCode, setJoinInitialCode] = useState('');
  const [isJoiningCode, setIsJoiningCode] = useState(false);
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<OnlineDate | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const openProfileByUserId = useCallback((userId: string) => {
    if (!userId || userId === 'guest') return;
    setProfileModalUserId(userId);
  }, []);

  const openHostProfile = useCallback(
    (date: OnlineDate) => {
      if (!date.hostUserId) {
        showToast('Could not load profile');
        return;
      }
      openProfileByUserId(date.hostUserId);
    },
    [openProfileByUserId, showToast],
  );

  const modalLiked = profileModal ? likedIds.has(profileModal.id) : false;

  const handleFlameFromModal = useCallback(() => {
    if (!profileModal || modalLiked) return;
    void sendFlame(profileModal.id);
  }, [modalLiked, profileModal, sendFlame]);

  const sendMatchGreeting = useCallback((profileId: string, text: string) => {
    void (async () => {
      const conversationId = await messageService.findConversationByProfileId(profileId);
      if (conversationId) await messageService.sendMessage(conversationId, text);
    })();
  }, []);

  useEffect(() => {
    if (!profileModalError) return;
    showToast('Could not load profile');
    setProfileModalUserId(null);
  }, [profileModalError, showToast]);

  const handleDeleteMeetup = useCallback(
    async (date: OnlineDate) => {
      if (!date.isHostedByYou) return;
      const confirmed = window.confirm(`Delete "${date.title}"? This cannot be undone.`);
      if (!confirmed) return;
      clearActionError();
      try {
        await deleteDate(date.id);
        showToast('Meetup deleted');
      } catch {
        /* actionError set in hook */
      }
    },
    [clearActionError, deleteDate, showToast],
  );

  const liveDates = dates.filter((d) => d.status === 'live');
  const upcomingDates = dates.filter((d) => d.status !== 'live');
  const discoverMeetups = [
    ...liveDates.filter((d) => !d.isHostedByYou),
    ...upcomingDates.filter((d) => !d.isHostedByYou),
  ];
  const myDates = dates.filter(
    (d) => d.isHostedByYou || acceptedDateIds.has(d.id),
  );

  const enterMeeting = useCallback(
    (date: OnlineDate, accessCode: string) => {
      setJoinModalOpen(false);
      setJoinTarget(null);
      clearActionError();
      setActiveMeeting({
        date,
        accessCode: accessCode.trim().toUpperCase(),
        localDisplayName: userProfile?.displayName ?? 'You',
      });
    },
    [clearActionError, userProfile?.displayName],
  );

  const openJoinModal = (date: OnlineDate, code = '') => {
    clearActionError();
    setJoinTarget(date);
    setJoinInitialCode(code);
    setJoinModalOpen(true);
  };

  const joinMeetup = useCallback(
    async (date: OnlineDate) => {
      if (!meetupRequiresAccessCode(date)) {
        clearActionError();
        try {
          const result = await joinDate(date.id, date.accessCode);
          enterMeeting(result.date, date.accessCode);
        } catch {
          /* actionError set in hook */
        }
        return;
      }

      const prefilledCode =
        date.isHostedByYou || acceptedDateIds.has(date.id) ? date.accessCode : '';
      openJoinModal(date, prefilledCode);
    },
    [acceptedDateIds, clearActionError, enterMeeting, joinDate],
  );

  const handleJoinSubmit = async (accessCode: string) => {
    if (!joinTarget) {
      setIsJoiningCode(true);
      try {
        const result = await joinByCode(accessCode);
        enterMeeting(result.date, accessCode);
      } catch {
        /* actionError set in hook */
      } finally {
        setIsJoiningCode(false);
      }
      return;
    }
    try {
      const result = await joinDate(joinTarget.id, accessCode);
      enterMeeting(result.date, accessCode);
    } catch {
      /* actionError */
    }
  };

  const handleCodeBarJoin = async (code: string) => {
    setIsJoiningCode(true);
    clearActionError();
    try {
      const result = await joinByCode(code);
      enterMeeting(result.date, code);
    } catch {
      /* actionError */
    } finally {
      setIsJoiningCode(false);
    }
  };

  useEffect(() => {
    const pendingCode = consumePendingMeetupCode();
    if (!pendingCode) return;
    void handleCodeBarJoin(pendingCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (input: Parameters<typeof createDate>[0]) => {
    setIsCreating(true);
    clearActionError();
    try {
      const created = await createDate(input);
      setCreateOpen(false);
      setShareTarget(created);
    } catch {
      /* actionError set in hook */
    } finally {
      setIsCreating(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string, title: string) => {
    setInviteBusyId(inviteId);
    try {
      const result = await respondToInvite(inviteId, 'accept');
      const code = result.invite.accessCode;
      if (result.date && code) {
        showToast(`Accepted ${title} — joining with code ${code}`);
        openJoinModal(result.date, code);
      } else {
        showToast(`Accepted ${title}`);
      }
    } finally {
      setInviteBusyId(null);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    setInviteBusyId(inviteId);
    try {
      await respondToInvite(inviteId, 'decline');
      showToast('Invite declined');
    } finally {
      setInviteBusyId(null);
    }
  };

  const copyCode = (code: string) => {
    void navigator.clipboard?.writeText(code);
    showToast('Code copied');
  };

  const copyLink = (link: string) => {
    void navigator.clipboard?.writeText(link);
    showToast('Link copied');
  };

  const hasLiveRail = !isLoading && !error && liveDates.length > 0;

  return (
    <div className={`online-dates-page ${hasLiveRail ? 'online-dates-page--has-live-rail' : ''}`}>
      <ScreenHeader
        title="Online Dates"
        action={
          <button
            type="button"
            className="online-dates-page__create-btn"
            onClick={() => setCreateOpen(true)}
            aria-label="Schedule meetup"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        }
      />

      {hasLiveRail && (
        <div className="online-dates-page__live-rail">
          <LiveMeetupsStrip
            dates={liveDates}
            joiningId={joiningId}
            onJoin={(date) => void joinMeetup(date)}
          />
        </div>
      )}

      <PageScroller
        className={`page-scroller--with-header ${hasLiveRail ? 'page-scroller--below-live-rail' : ''}`}
      >
        {isLoading && <PageTransitionSplash />}
        {error && <FeedState message={error} onRetry={() => void refetch()} />}

        {!isLoading && !error && (
          <div className="online-dates-page__content">
            {invites.length > 0 && (
              <section className="online-dates-page__section">
                <h2 className="online-dates-page__section-title">
                  Invites for you
                  <span className="online-dates-page__badge">{invites.length}</span>
                </h2>
                <div className="online-dates-page__stack">
                  {invites.map((invite) => (
                    <DateInviteCard
                      key={invite.id}
                      invite={invite}
                      isBusy={inviteBusyId === invite.id}
                      onAccept={() => void handleAcceptInvite(invite.id, invite.title)}
                      onDecline={() => void handleDeclineInvite(invite.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {myDates.length > 0 && (
              <section className="online-dates-page__section">
                <h2 className="online-dates-page__section-title">Your meetups</h2>
                <div className="online-dates-page__stack">
                  {myDates.map((date) => (
                    <OnlineDateCard
                      key={date.id}
                      date={date}
                      isJoining={joiningId === date.id}
                      isDeleting={deletingId === date.id}
                      onCopyCode={copyCode}
                      onCopyLink={copyLink}
                      onJoin={() => void joinMeetup(date)}
                      onHostClick={(d) => void openHostProfile(d)}
                      onProfileClick={(userId) => openProfileByUserId(userId)}
                      onDelete={
                        date.isHostedByYou
                          ? () => void handleDeleteMeetup(date)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {discoverMeetups.length > 0 && (
              <section className="online-dates-page__section online-dates-page__section--feed">
                <h2 className="online-dates-page__section-title">For you</h2>
                <MeetupVerticalFeed
                  className="online-dates-page__feed"
                  dates={discoverMeetups}
                  joiningId={joiningId}
                  onCopyCode={copyCode}
                  onCopyLink={copyLink}
                  onJoin={(date) => void joinMeetup(date)}
                  onHostClick={(d) => void openHostProfile(d)}
                  onProfileClick={(userId) => openProfileByUserId(userId)}
                />
              </section>
            )}
          </div>
        )}
      </PageScroller>

      {toast && (
        <div className="online-dates-page__toast" role="status">
          {toast}
        </div>
      )}

      <MeetupShareSheet
        open={Boolean(shareTarget)}
        date={shareTarget}
        onClose={() => setShareTarget(null)}
        onCopyCode={copyCode}
        onCopyLink={copyLink}
      />

      <CreateDateSheet
        open={createOpen}
        isCreating={isCreating}
        error={createOpen ? actionError : null}
        onClose={() => {
          setCreateOpen(false);
          clearActionError();
        }}
        onCreate={handleCreate}
      />

      <JoinDateModal
        open={joinModalOpen && !activeMeeting}
        date={joinTarget}
        initialCode={joinInitialCode}
        isJoining={Boolean(joiningId) || isJoiningCode}
        error={joinModalOpen ? actionError : null}
        onClose={() => {
          setJoinModalOpen(false);
          setJoinTarget(null);
          clearActionError();
        }}
        onJoin={(code) => void handleJoinSubmit(code)}
      />

      {activeMeeting && (
        <ActiveMeetingContainer
          session={activeMeeting}
          onLeave={() => {
            setActiveMeeting(null);
            showToast('Left meetup');
          }}
        />
      )}

      <MatchProfileModal
        open={profileModalUserId !== null}
        mode="discover"
        profile={profileModal}
        liked={modalLiked}
        likedYou={profileModal?.likedYou ?? false}
        isLoading={profileModalLoading}
        isSubmittingFlame={isFlameSubmitting}
        onClose={() => setProfileModalUserId(null)}
        onFlame={handleFlameFromModal}
        onSendMessage={
          profileModal && modalLiked && profileModal.likedYou
            ? (text) => sendMatchGreeting(profileModal.id, text)
            : undefined
        }
      />
    </div>
  );
}
