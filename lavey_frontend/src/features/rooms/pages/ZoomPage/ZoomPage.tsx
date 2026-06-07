import { useCallback, useEffect, useState } from 'react';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { PageScroller } from '@/components/layout/PageScroller';
import { CreateDateSheet } from '@/components/rooms/CreateDateSheet';
import { DateInviteCard } from '@/components/rooms/DateInviteCard';
import { JoinDateCodeBar } from '@/components/rooms/JoinDateCodeBar';
import { JoinDateModal } from '@/components/rooms/JoinDateModal';
import { OnlineDateCard } from '@/components/rooms/OnlineDateCard';
import { FeedState } from '@/components/ui/FeedState';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { ActiveMeetingContainer } from '@/features/rooms/containers/ActiveMeetingContainer';
import { useOnlineDates, useUserProfile } from '@/hooks';
import type { ActiveMeetingSession, OnlineDate } from '@/types';
import './ZoomPage.css';

export function ZoomPage() {
  const {
    dates,
    invites,
    isLoading,
    error,
    actionError,
    joiningId,
    refetch,
    joinDate,
    joinByCode,
    createDate,
    respondToInvite,
    clearActionError,
  } = useOnlineDates();
  const { profile: userProfile } = useUserProfile();

  const [createOpen, setCreateOpen] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeetingSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState<OnlineDate | null>(null);
  const [joinInitialCode, setJoinInitialCode] = useState('');
  const [isJoiningCode, setIsJoiningCode] = useState(false);
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const liveDates = dates.filter((d) => d.status === 'live');
  const upcomingDates = dates.filter((d) => d.status !== 'live');
  const myDates = dates.filter((d) => d.isHostedByYou);

  const openJoinModal = (date: OnlineDate, code = '') => {
    clearActionError();
    setJoinTarget(date);
    setJoinInitialCode(code);
    setJoinModalOpen(true);
  };

  const enterMeeting = (date: OnlineDate, accessCode: string) => {
    setJoinModalOpen(false);
    setJoinTarget(null);
    clearActionError();
    setActiveMeeting({
      date,
      accessCode: accessCode.trim().toUpperCase(),
      localDisplayName: userProfile?.displayName ?? 'You',
    });
  };

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
    const pendingCode = window.sessionStorage.getItem('lavey:adminJoinCode');
    if (!pendingCode) return;
    window.sessionStorage.removeItem('lavey:adminJoinCode');
    void handleCodeBarJoin(pendingCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (input: Parameters<typeof createDate>[0]) => {
    setIsCreating(true);
    try {
      const created = await createDate(input);
      showToast(
        input.mode === 'invite' || input.visibility === 'private'
          ? `Invite sent · code ${created.accessCode}`
          : `Posted · code ${created.accessCode}`,
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string, code: string, title: string) => {
    setInviteBusyId(inviteId);
    try {
      await respondToInvite(inviteId, 'accept');
      showToast(`Accepted — use code ${code} for ${title}`);
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

  return (
    <div className="online-dates-page">
      <ScreenHeader
        title="Online Dates"
        subtitle="Video meetups · code to join · invite your match"
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

      <PageScroller className="page-scroller--with-header">
        <div className="online-dates-page__top">
          <JoinDateCodeBar
            isJoining={isJoiningCode}
            error={!joinModalOpen ? actionError : null}
            onJoin={(code) => void handleCodeBarJoin(code)}
          />
        </div>

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
                      onAccept={() =>
                        void handleAcceptInvite(invite.id, invite.accessCode, invite.title)
                      }
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
                      onCopyCode={copyCode}
                      onJoin={() => openJoinModal(date, date.accessCode)}
                    />
                  ))}
                </div>
              </section>
            )}

            {liveDates.length > 0 && (
              <section className="online-dates-page__section">
                <h2 className="online-dates-page__section-title">
                  <span className="online-dates-page__live-dot" />
                  Live now
                </h2>
                <div className="online-dates-page__stack">
                  {liveDates.filter((d) => !d.isHostedByYou).map((date) => (
                    <OnlineDateCard
                      key={date.id}
                      date={date}
                      isJoining={joiningId === date.id}
                      onCopyCode={copyCode}
                      onJoin={() => openJoinModal(date)}
                    />
                  ))}
                </div>
              </section>
            )}

            {upcomingDates.length > 0 && (
              <section className="online-dates-page__section">
                <h2 className="online-dates-page__section-title">Coming up</h2>
                <div className="online-dates-page__stack">
                  {upcomingDates.filter((d) => !d.isHostedByYou).map((date) => (
                    <OnlineDateCard
                      key={date.id}
                      date={date}
                      isJoining={joiningId === date.id}
                      onCopyCode={copyCode}
                      onJoin={() => openJoinModal(date)}
                    />
                  ))}
                </div>
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

      <CreateDateSheet
        open={createOpen}
        isCreating={isCreating}
        onClose={() => setCreateOpen(false)}
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
    </div>
  );
}
