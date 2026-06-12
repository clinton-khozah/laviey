import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { PageScroller } from '@/components/layout/PageScroller';
import { SheetSaveSuccess } from '@/components/profile/SheetSaveSuccess';
import { CreateDateSheet } from '@/components/rooms/CreateDateSheet';
import { DateInviteCard } from '@/components/rooms/DateInviteCard';
import { DeleteMeetupConfirmSheet } from '@/components/rooms/DeleteMeetupConfirmSheet';
import { JoinDateModal } from '@/components/rooms/JoinDateModal';
import { MeetupShareSheet } from '@/components/rooms/MeetupShareSheet';
import { LiveMeetupsStrip } from '@/components/rooms/LiveMeetupsStrip';
import { MeetupVerticalFeed } from '@/components/rooms/MeetupVerticalFeed';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { FeedState } from '@/components/ui/FeedState';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { MatchProfileModal } from '@/components/messages/MatchProfileModal';
import { ActiveMeetingContainer } from '@/features/rooms/containers/ActiveMeetingContainer';
import {
  useMatchActions,
  useMatchProfile,
  useOnlineDates,
  useUserProfile,
  type ProfileLookup,
} from '@/hooks';
import { messageService } from '@/services';
import type { ActiveMeetingSession, OnlineDate, UpdateDateInput } from '@/types';
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
    updateDate,
    deleteDate,
    respondToInvite,
    clearActionError,
  } = useOnlineDates();
  const { profile: userProfile } = useUserProfile();
  const { likedIds, sendFlame, isSubmitting: isFlameSubmitting } = useMatchActions();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<OnlineDate | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileLookup, setProfileLookup] = useState<ProfileLookup | null>(null);
  const {
    profile: profileModal,
    isLoading: profileModalLoading,
    error: profileModalError,
  } = useMatchProfile(profileLookup);
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeetingSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState<OnlineDate | null>(null);
  const [joinInitialCode, setJoinInitialCode] = useState('');
  const [isJoiningCode, setIsJoiningCode] = useState(false);
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<OnlineDate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OnlineDate | null>(null);
  const [deleteSuccessTitle, setDeleteSuccessTitle] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const openProfileByUserId = useCallback((userId: string) => {
    if (!userId || userId === 'guest') return;
    setProfileLookup({ type: 'user', id: userId });
  }, []);

  const openHostProfile = useCallback((date: OnlineDate) => {
    if (!date.id) return;
    setProfileLookup({ type: 'meetup-host', meetupId: date.id });
  }, []);

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
    setProfileLookup(null);
  }, [profileModalError, showToast]);

  const requestDeleteMeetup = useCallback((date: OnlineDate) => {
    if (!date.isHostedByYou) return;
    clearActionError();
    setDeleteTarget(date);
  }, [clearActionError]);

  const closeDeleteSheet = useCallback(() => {
    setDeleteTarget(null);
    clearActionError();
  }, [clearActionError]);

  const confirmDeleteMeetup = useCallback(async () => {
    if (!deleteTarget) return;
    clearActionError();
    try {
      const title = deleteTarget.title;
      await deleteDate(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteSuccessTitle(title);
    } catch {
      /* actionError set in hook */
    }
  }, [clearActionError, deleteDate, deleteTarget]);

  const handleEditMeetup = useCallback(
    (date: OnlineDate) => {
      if (!date.isHostedByYou) return;
      clearActionError();
      setEditingDate(date);
    },
    [clearActionError],
  );

  const handleUpdateMeetup = useCallback(
    async (dateId: string, input: UpdateDateInput) => {
      setIsUpdating(true);
      clearActionError();
      try {
        await updateDate(dateId, input);
        setEditingDate(null);
        showToast('Meetup updated');
      } catch {
        /* actionError set in hook */
      } finally {
        setIsUpdating(false);
      }
    },
    [clearActionError, showToast, updateDate],
  );

  const closeMeetupSheet = useCallback(() => {
    setCreateOpen(false);
    setEditingDate(null);
    clearActionError();
  }, [clearActionError]);

  const liveDates = dates.filter((d) => d.status === 'live');
  const upcomingDates = dates.filter((d) => d.status !== 'live');
  const discoverMeetups = [
    ...liveDates.filter((d) => !d.isHostedByYou),
    ...upcomingDates.filter((d) => !d.isHostedByYou),
  ];
  const myDates = dates.filter(
    (d) => d.isHostedByYou || acceptedDateIds.has(d.id),
  );

  const feedMeetups = useMemo(() => {
    const byId = new Map<string, OnlineDate>();
    for (const date of myDates) byId.set(date.id, date);
    for (const date of discoverMeetups) byId.set(date.id, date);

    const statusOrder = { live: 0, 'starting-soon': 1, scheduled: 2 } as const;
    return [...byId.values()].sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      if (a.isHostedByYou && !b.isHostedByYou) return -1;
      if (!a.isHostedByYou && b.isHostedByYou) return 1;
      return 0;
    });
  }, [discoverMeetups, myDates]);

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

  const meetupSheetOpen = createOpen || editingDate !== null;
  const stripMeetups = feedMeetups;
  const hasLiveRail = !isLoading && !error && stripMeetups.length > 0;
  const hasMeetupContent = invites.length > 0 || feedMeetups.length > 0;

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
            dates={stripMeetups}
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

            {feedMeetups.length > 0 && (
              <section className="online-dates-page__section online-dates-page__section--feed">
                <MeetupVerticalFeed
                  className="online-dates-page__feed"
                  dates={feedMeetups}
                  joiningId={joiningId}
                  deletingId={deletingId}
                  onCopyCode={copyCode}
                  onCopyLink={copyLink}
                  onJoin={(date) => void joinMeetup(date)}
                  onEdit={handleEditMeetup}
                  onDelete={requestDeleteMeetup}
                  onHostClick={(d) => void openHostProfile(d)}
                  onProfileClick={(userId) => openProfileByUserId(userId)}
                />
              </section>
            )}

            {!hasMeetupContent && (
              <FeedState
                message="No meetups yet. Tap + to schedule a public room or invite a match."
                onRetry={() => void refetch()}
                retryLabel="Refresh"
              />
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
        open={meetupSheetOpen}
        isCreating={isCreating || isUpdating}
        editingDate={editingDate}
        error={meetupSheetOpen ? actionError : null}
        onClose={closeMeetupSheet}
        onCreate={handleCreate}
        onUpdate={handleUpdateMeetup}
      />

      <DeleteMeetupConfirmSheet
        open={deleteTarget !== null}
        date={deleteTarget}
        isDeleting={Boolean(deleteTarget && deletingId === deleteTarget.id)}
        error={deleteTarget ? actionError : null}
        onClose={closeDeleteSheet}
        onConfirm={() => void confirmDeleteMeetup()}
      />

      {deleteSuccessTitle && (
        <AppOverlay>
          <button
            type="button"
            className="online-dates-page__success-backdrop"
            onClick={() => setDeleteSuccessTitle(null)}
            aria-label="Close"
          />
          <div className="online-dates-page__success-overlay">
            <SheetSaveSuccess
              action="meetup-delete"
              detail={deleteSuccessTitle}
              onComplete={() => setDeleteSuccessTitle(null)}
            />
          </div>
        </AppOverlay>
      )}

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
        open={profileLookup !== null}
        mode="discover"
        profile={profileModal}
        liked={modalLiked}
        likedYou={profileModal?.likedYou ?? false}
        isLoading={profileModalLoading}
        isSubmittingFlame={isFlameSubmitting}
        onClose={() => setProfileLookup(null)}
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
