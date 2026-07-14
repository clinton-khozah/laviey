import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConversationListItem } from '@/components/messages/ConversationListItem';
import { ChatThread } from '@/components/messages/ChatThread';
import { ICrushThread } from '@/components/messages/ICrushThread';
import { NotificationThread } from '@/components/messages/NotificationThread';
import { LaveyPromoThread } from '@/components/messages/LaveyPromoThread';
import type { ChatConversationAction } from '@/components/messages/ChatSendOptionsMenu';
import { MatchProfileModal } from '@/components/messages/MatchProfileModal';
import { MessagesDiscoverPage } from '@/components/messages/MessagesDiscoverPage';
import { DiscoverFilterSheet } from '@/components/discover/DiscoverFilterSheet';
import { DiscoveryPhoneSearchSheet } from '@/components/discover/DiscoveryPhoneSearchSheet';
import { PaidChatSheet } from '@/components/discover/PaidChatSheet';
import { DirectVideoCall } from '@/components/messages/DirectVideoCall';
import { IncomingVideoCall } from '@/components/messages/IncomingVideoCall';
import { MessagesHeader, type MessageFilter } from '@/components/messages/MessagesHeader';
import { OnlineMatchesStrip } from '@/components/messages/MessageMatchStrip';
import { PageScroller } from '@/components/layout/PageScroller';
import { FeedState } from '@/components/ui/FeedState';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { ConversationOptionsSheet } from '@/components/messages/ConversationOptionsSheet';
import { DeleteChatSheet } from '@/components/messages/DeleteChatSheet';
import { APP_IMAGES } from '@/constants/images';
import { NOTIFICATIONS_CONVERSATION_ID } from '@/constants/notifications';
import { LAVEY_OFFICIAL_CONVERSATION_ID } from '@/constants/laveyOfficial';
import { useChatThread, useConversations, useMatchProfile, useMatchActions, useNotificationInbox, useMessagesDiscoverSuggestions, useMessagesFindSuggestions, useDiscoverFilters } from '@/hooks';
import { chatVideoCallService, messageService, matchService } from '@/services';
import { privacyService } from '@/services/privacy/privacyService';
import { profileService } from '@/services/profile/profileService';
import { reportsService } from '@/services/reports/reportsService';
import type { ChatVideoCall, Conversation, DeleteConversationScope, Profile } from '@/types';
import { isMatchConversation, sortConversations } from '@/utils/messages/sortConversations';
import { isICrushConversation } from '@/utils/messages/iCrushConversation';
import { isLaveyOfficialConversation } from '@/utils/messages/laveyOfficialConversation';
import { openChatWithProfile } from '@/utils/navigation/appNav';
import { primeCallAudio } from '@/utils/audio/callRingtone';
import './MessagesPage.css';

function takePendingGreeting(): { profileId: string; text: string } | null {
  const profileId = window.sessionStorage.getItem('lavey:pendingGreetingProfileId');
  const text = window.sessionStorage.getItem('lavey:pendingGreetingText');
  if (!profileId || !text) return null;
  window.sessionStorage.removeItem('lavey:pendingGreetingProfileId');
  window.sessionStorage.removeItem('lavey:pendingGreetingText');
  return { profileId, text };
}

function takeOpenChatProfileId(): string | null {
  const profileId = window.sessionStorage.getItem('lavey:openChatProfileId');
  if (!profileId) return null;
  window.sessionStorage.removeItem('lavey:openChatProfileId');
  return profileId;
}

export function MessagesPage() {
  const {
    conversations,
    isLoading,
    error,
    refetch,
    deleteConversation,
    toggleConversationStar,
  } = useConversations();
  const {
    likedIds,
    likedPostIds,
    iCrushSentIds,
    matchToast,
    sendFlame,
    sendICrush,
    likePost,
    dismissMatchToast,
    isSubmitting: isFlameSubmitting,
  } = useMatchActions();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [phoneSearchOpen, setPhoneSearchOpen] = useState(false);
  const [phoneSearchActive, setPhoneSearchActive] = useState(false);
  const [phoneSearchProfiles, setPhoneSearchProfiles] = useState<Profile[]>([]);
  const [discoverFiltersOpen, setDiscoverFiltersOpen] = useState(false);
  const [paidChatProfile, setPaidChatProfile] = useState<Profile | null>(null);
  const [discoverProfile, setDiscoverProfile] = useState<Profile | null>(null);
  // Used to auto-send a greeting from `MatchProfileModal` after we switch into the chat.
  const [pendingAutoMessage, setPendingAutoMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<MessageFilter>('all');
  const [profileConversation, setProfileConversation] = useState<Conversation | null>(null);
  const [optionsTarget, setOptionsTarget] = useState<Conversation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [mutedConversationIds, setMutedConversationIds] = useState<Set<string>>(() => new Set());
  const [actionToast, setActionToast] = useState<{ text: string; success?: boolean } | null>(null);
  const [notificationProfileId, setNotificationProfileId] = useState<string | null>(null);
  const [iCrushResponding, setICrushResponding] = useState(false);
  const [activeVideoCall, setActiveVideoCall] = useState<ChatVideoCall | null>(null);
  const [incomingVideoCall, setIncomingVideoCall] = useState<ChatVideoCall | null>(null);
  const [videoCallBusy, setVideoCallBusy] = useState(false);

  useEffect(() => {
    const prime = () => primeCallAudio();
    window.addEventListener('pointerdown', prime, { once: true });
    window.addEventListener('keydown', prime, { once: true });
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('keydown', prime);
    };
  }, []);

  const showActionToast = useCallback((message: string, success = false) => {
    setActionToast({ text: message, success });
    window.setTimeout(() => setActionToast(null), 2600);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncVideoCall = async () => {
      try {
        const call = await chatVideoCallService.getActive();
        if (cancelled) return;
        if (!call) {
          setActiveVideoCall(null);
          setIncomingVideoCall(null);
          return;
        }
        if (call.direction === 'incoming' && call.status === 'ringing') {
          setIncomingVideoCall(call);
          setActiveVideoCall((current) => (current?.id === call.id ? current : null));
          return;
        }
        setIncomingVideoCall(null);
        setActiveVideoCall(call);
      } catch {
        // Keep the current call UI during a temporary network interruption.
      }
    };

    void syncVideoCall();
    const intervalId = window.setInterval(() => void syncVideoCall(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const startVideoCall = useCallback(async (conversation: Conversation) => {
    if (videoCallBusy) return;
    primeCallAudio();
    setVideoCallBusy(true);
    try {
      const call = await chatVideoCallService.start(conversation.id);
      if (call.direction === 'incoming' && call.status === 'ringing') {
        setIncomingVideoCall(call);
      } else {
        setIncomingVideoCall(null);
        setActiveVideoCall(call);
      }
    } catch (error) {
      showActionToast(error instanceof Error ? error.message : 'Could not start the video call');
    } finally {
      setVideoCallBusy(false);
    }
  }, [showActionToast, videoCallBusy]);

  const answerVideoCall = useCallback(async () => {
    if (!incomingVideoCall || videoCallBusy) return;
    setVideoCallBusy(true);
    try {
      const call = await chatVideoCallService.update(incomingVideoCall.id, 'answer');
      setIncomingVideoCall(null);
      setActiveVideoCall(call);
      setActiveId(call.conversationId);
    } catch (error) {
      setIncomingVideoCall(null);
      showActionToast(error instanceof Error ? error.message : 'This call is no longer available');
    } finally {
      setVideoCallBusy(false);
    }
  }, [incomingVideoCall, showActionToast, videoCallBusy]);

  const declineVideoCall = useCallback(async () => {
    if (!incomingVideoCall || videoCallBusy) return;
    setVideoCallBusy(true);
    try {
      await chatVideoCallService.update(incomingVideoCall.id, 'decline');
    } catch {
      // The caller may already have ended it.
    } finally {
      setIncomingVideoCall(null);
      setVideoCallBusy(false);
    }
  }, [incomingVideoCall, videoCallBusy]);

  const endVideoCall = useCallback(async () => {
    const call = activeVideoCall;
    setActiveVideoCall(null);
    if (!call) return;
    try {
      await chatVideoCallService.update(call.id, 'end');
    } catch {
      // Closing the local camera remains immediate if the network drops.
    }
  }, [activeVideoCall]);

  const {
    messages,
    isLoading: threadLoading,
    isSending,
    sendMessage,
    sendPhoto,
    sendAudio,
    notifyTyping,
    reactToMessage,
    deleteMessage,
  } = useChatThread(
    !activeId ||
    activeId === NOTIFICATIONS_CONVERSATION_ID ||
    activeId === LAVEY_OFFICIAL_CONVERSATION_ID ||
    activeId.startsWith('icrush-')
      ? null
      : activeId,
  );

  const {
    notifications,
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications,
    markRead: markNotificationsRead,
  } = useNotificationInbox(activeId === NOTIFICATIONS_CONVERSATION_ID);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const isICrushActive = Boolean(activeConversation && isICrushConversation(activeConversation));

  const matchConversations = useMemo(
    () => conversations.filter(isMatchConversation),
    [conversations],
  );

  useEffect(() => {
    if (!isICrushActive || !activeConversation?.id) return;
    void messageService.getMessages(activeConversation.id).then(() => refetch(true));
  }, [isICrushActive, activeConversation?.id, refetch]);

  useEffect(() => {
    if (!activeId) return;
    const intervalId = window.setInterval(() => void refetch(true), 4000);
    return () => window.clearInterval(intervalId);
  }, [activeId, refetch]);

  const { profile, isLoading: profileLoading } = useMatchProfile(
    profileConversation?.participantProfileId ?? null,
  );

  const { profile: notificationProfile, isLoading: notificationProfileLoading } = useMatchProfile(
    notificationProfileId,
  );

  const {
    filters: discoverFilters,
    setFilters: setDiscoverFilters,
    resetFilters: resetDiscoverFilters,
    hasActiveFilters: hasActiveDiscoverFilters,
  } = useDiscoverFilters();

  const {
    profiles: discoverProfiles,
    isLoading: discoverLoading,
    error: discoverError,
    refetch: refetchDiscover,
  } = useMessagesDiscoverSuggestions(discoverOpen && !findOpen);

  const {
    profiles: findProfiles,
    isLoading: findLoading,
    error: findError,
    refetch: refetchFind,
  } = useMessagesFindSuggestions(findOpen, discoverFilters);

  const handlePhoneSearch = async (
    value: string,
    kind: 'phone' | 'email',
  ): Promise<number> => {
    const result =
      kind === 'phone'
        ? await privacyService.searchByPhone(value)
        : await privacyService.searchByEmail(value);
    const matchedProfiles = await Promise.all(
      result.matches.map((match) => profileService.getProfileById(match.userId)),
    );
    setPhoneSearchProfiles(matchedProfiles);
    setPhoneSearchActive(true);
    setFindOpen(true);
    return matchedProfiles.length;
  };

  const openDiscoverFilters = () => {
    setPhoneSearchActive(false);
    setPhoneSearchProfiles([]);
    setFindOpen(true);
    setDiscoverFiltersOpen(true);
  };

  const handlePaidChat = async (profile: Profile) => {
    try {
      const conversationId = await messageService.findConversationByProfileId(profile.id);
      if (conversationId) {
        setFindOpen(false);
        setDiscoverOpen(false);
        openChatWithProfile(profile.id);
        return;
      }
    } catch {
      // If there is no existing chat, the purchase sheet handles the unlock.
    }
    setPaidChatProfile(profile);
  };

  const handleLaveyPromoRead = useCallback(() => {
    void refetch(true);
  }, [refetch]);

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const filterCounts = useMemo(
    () => ({
      all: conversations.length,
      unread: conversations.filter((c) => c.unreadCount > 0).length,
      online: matchConversations.filter((c) => c.isOnline).length,
    }),
    [conversations, matchConversations],
  );

  const sortedConversations = useMemo(
    () => sortConversations(conversations),
    [conversations],
  );

  const onlineStripConversations = useMemo(
    () => matchConversations.filter((conversation) => conversation.isOnline),
    [matchConversations],
  );

  const filtered = useMemo(() => {
    let list = sortedConversations;

    if (filter === 'unread') list = list.filter((c) => c.unreadCount > 0);
    if (filter === 'online') list = list.filter((c) => c.isOnline && isMatchConversation(c));

    return list;
  }, [sortedConversations, filter]);

  const listConversations = useMemo(() => {
    if (filter === 'online') return [];
    if (filter === 'all') return sortedConversations;
    return filtered;
  }, [filter, filtered, sortedConversations]);

  const showOnlineStrip =
    (filter === 'all' || filter === 'online') && onlineStripConversations.length > 0;
  const hasStripContent = showOnlineStrip;

  const handleMarkNotificationsRead = useCallback(() => {
    void markNotificationsRead().then(() => {
      void refetch(true);
    });
  }, [markNotificationsRead, refetch]);

  const handleNotificationLikeBack = useCallback(
    (profileId: string) => {
      void sendFlame(profileId).then(() => {
        void refetchNotifications(true);
        void refetch(true);
      });
    },
    [sendFlame, refetchNotifications, refetch],
  );

  const openProfile = (conversation: Conversation) => {
    setProfileConversation(conversation);
  };

  const closeProfile = () => setProfileConversation(null);

  const handleDiscoverFlame = useCallback(
    (profileId: string) => {
      void sendFlame(profileId).then(() => void refetch(true));
    },
    [sendFlame, refetch],
  );

  const handleDiscoverPostLike = useCallback(
    (profile: Profile) => {
      const postId = profile.posts[0]?.id;
      if (!postId || likedPostIds.has(postId)) return;
      void likePost(postId, profile.id);
    },
    [likePost, likedPostIds],
  );

  const handleDiscoverICrush = useCallback(
    (profileId: string) => {
      void sendICrush(profileId).then(() => void refetch(true));
    },
    [sendICrush, refetch],
  );

  const handleDiscoverMatchGreeting = useCallback(
    (text: string) => {
      if (!matchToast?.profileId) return;
      window.sessionStorage.setItem('lavey:pendingGreetingProfileId', matchToast.profileId);
      window.sessionStorage.setItem('lavey:pendingGreetingText', text);
      dismissMatchToast();
      setDiscoverOpen(false);
      setFindOpen(false);
    },
    [matchToast, dismissMatchToast],
  );

  const handleFindMatchGreeting = useCallback(
    (text: string) => {
      if (!matchToast?.profileId) return;
      window.sessionStorage.setItem('lavey:pendingGreetingProfileId', matchToast.profileId);
      window.sessionStorage.setItem('lavey:pendingGreetingText', text);
      dismissMatchToast();
      setFindOpen(false);
      setDiscoverOpen(false);
    },
    [matchToast, dismissMatchToast],
  );

  const handleDiscoverProfileFlame = useCallback(() => {
    if (!discoverProfile) return;
    void sendFlame(discoverProfile.id).then(() => {
      void refetchDiscover();
      void refetch(true);
      showActionToast('Like sent', true);
    });
  }, [discoverProfile, sendFlame, refetchDiscover, refetch, showActionToast]);

  const handleMessageFromProfile = () => {
    if (!profileConversation) return;
    setActiveId(profileConversation.id);
    closeProfile();
  };

  const handleSendMessageFromProfile = (text: string) => {
    if (!profileConversation) return;
    setActiveId(profileConversation.id);
    // Keep the popup open (per request) and send once the ChatThread is active.
    setPendingAutoMessage(text);
  };

  useEffect(() => {
    const pending = takePendingGreeting();
    if (!pending) return;

    void (async () => {
      let conversation = conversations.find((c) => c.participantProfileId === pending.profileId);
      if (!conversation) {
        const conversationId = await messageService.findConversationByProfileId(pending.profileId);
        if (conversationId) {
          setActiveId(conversationId);
          setPendingAutoMessage(pending.text);
          await refetch(true);
          return;
        }
      }
      if (conversation) {
        setActiveId(conversation.id);
        setPendingAutoMessage(pending.text);
      }
    })();
  }, [conversations, refetch]);

  useEffect(() => {
    const profileId = takeOpenChatProfileId();
    if (!profileId) return;

    void (async () => {
      const existing = conversations.find((c) => c.participantProfileId === profileId);
      if (existing) {
        setActiveId(existing.id);
        return;
      }
      const conversationId = await messageService.findConversationByProfileId(profileId);
      if (conversationId) {
        setActiveId(conversationId);
        await refetch(true);
      }
    })();
  }, [conversations, refetch]);

  useEffect(() => {
    if (!pendingAutoMessage) return;
    if (!activeId) return;
    void sendMessage(pendingAutoMessage);
    setPendingAutoMessage(null);
  }, [pendingAutoMessage, activeId, sendMessage]);

  const openOptionsSheet = (conversation: Conversation) => {
    setOptionsTarget(conversation);
  };

  const closeOptionsSheet = () => setOptionsTarget(null);

  const openDeleteSheet = (conversation: Conversation) => {
    closeOptionsSheet();
    setDeleteTarget(conversation);
  };

  const closeDeleteSheet = () => setDeleteTarget(null);

  const handleToggleStar = () => {
    if (!optionsTarget) return;
    void toggleConversationStar(optionsTarget.id);
    closeOptionsSheet();
  };

  const handleDeleteChat = async (
    scope: DeleteConversationScope,
    conversationId?: string,
  ) => {
    const id = conversationId ?? deleteTarget?.id;
    if (!id) return;
    await deleteConversation(id, scope);
    if (activeId === id) setActiveId(null);
    if (profileConversation?.id === id) closeProfile();
    closeDeleteSheet();
  };

  const handleConversationAction = (action: ChatConversationAction) => {
    if (!activeConversation) return;
    if (isICrushConversation(activeConversation)) return;

    switch (action) {
      case 'view-profile':
        openProfile(activeConversation);
        return;
      case 'pin':
        void toggleConversationStar(activeConversation.id);
        showActionToast(activeConversation.isPinned ? 'Chat unpinned' : 'Chat pinned');
        return;
      case 'mute': {
        const isMuted = mutedConversationIds.has(activeConversation.id);
        setMutedConversationIds((prev) => {
          const next = new Set(prev);
          if (isMuted) next.delete(activeConversation.id);
          else next.add(activeConversation.id);
          return next;
        });
        showActionToast(isMuted ? 'Notifications unmuted' : 'Notifications muted');
        return;
      }
      case 'mark-unread':
        showActionToast('Marked as unread');
        return;
      case 'archive':
        void deleteConversation(activeConversation.id, 'for_you').then(() => {
          setActiveId(null);
          showActionToast('Chat archived');
        });
        return;
      case 'report':
        void reportsService
          .submit({
            subjectUserId: activeConversation.participantProfileId,
            contentType: 'chat_message',
            reason: 'Inappropriate behavior in chat',
          })
          .then(() => showActionToast(`Report submitted for ${activeConversation.participantName}`))
          .catch(() => showActionToast('Could not submit report'));
        return;
      case 'block':
        void privacyService
          .blockUser(activeConversation.participantProfileId)
          .then(() => deleteConversation(activeConversation.id, 'for_you'))
          .then(() => {
            setActiveId(null);
            showActionToast(`${activeConversation.participantName} blocked`);
          })
          .catch(() => showActionToast('Could not block user'));
        return;
      case 'unmatch':
        setDeleteTarget(activeConversation);
        return;
      case 'delete-chat':
        setDeleteTarget(activeConversation);
        return;
      default:
        return;
    }
  };

  const handleAcceptICrush = useCallback(() => {
    const inviteId = activeConversation?.iCrushInviteId;
    if (!inviteId) return;

    setICrushResponding(true);
    void matchService
      .acceptICrush(inviteId)
      .then((result) => {
        setActiveId(result.conversationId);
        showActionToast(`You matched with ${result.profileName}!`, true);
        return refetch(true);
      })
      .catch(() => showActionToast('Could not accept crushy'))
      .finally(() => setICrushResponding(false));
  }, [activeConversation?.iCrushInviteId, refetch, showActionToast]);

  const handleRejectICrush = useCallback(() => {
    const inviteId = activeConversation?.iCrushInviteId;
    if (!inviteId) return;

    setICrushResponding(true);
    void matchService
      .rejectICrush(inviteId)
      .then(() => {
        setActiveId(null);
        showActionToast('Passed on crushy', true);
        return refetch(true);
      })
      .catch(() => showActionToast('Could not update crushy'))
      .finally(() => setICrushResponding(false));
  }, [activeConversation?.iCrushInviteId, refetch, showActionToast]);

  return (
    <>
      {findOpen ? (
        <MessagesDiscoverPage
          profiles={phoneSearchActive ? phoneSearchProfiles : findProfiles}
          likedIds={likedIds}
          likedPostIds={likedPostIds}
          iCrushSentIds={iCrushSentIds}
          matchToast={matchToast}
          isLoading={phoneSearchActive ? false : findLoading}
          error={phoneSearchActive ? null : findError}
          onBack={() => {
            setFindOpen(false);
            setPhoneSearchActive(false);
            setPhoneSearchProfiles([]);
          }}
          onFlame={handleDiscoverFlame}
          onICrush={handleDiscoverICrush}
          onPostLike={handleDiscoverPostLike}
          onProfileClick={(p) => setDiscoverProfile(p)}
          onPaidChat={(profile) => void handlePaidChat(profile)}
          onDismissMatchToast={dismissMatchToast}
          onMatchGreeting={handleFindMatchGreeting}
          onRetry={() => {
            if (phoneSearchActive) setPhoneSearchOpen(true);
            else void refetchFind();
          }}
          onSearchClick={() => setPhoneSearchOpen(true)}
          onFilterClick={openDiscoverFilters}
          hasActiveFilters={hasActiveDiscoverFilters}
          emptyMessage={
            phoneSearchActive
              ? 'No opted-in profile was found for those contact details.'
              : undefined
          }
          resultLabel={phoneSearchActive ? 'Phone or email search result' : undefined}
        />
      ) : discoverOpen ? (
        <MessagesDiscoverPage
          profiles={discoverProfiles}
          likedIds={likedIds}
          likedPostIds={likedPostIds}
          iCrushSentIds={iCrushSentIds}
          matchToast={matchToast}
          isLoading={discoverLoading}
          error={discoverError}
          onBack={() => {
            setDiscoverOpen(false);
            setFindOpen(false);
          }}
          onSearchClick={() => setPhoneSearchOpen(true)}
          onFilterClick={openDiscoverFilters}
          hasActiveFilters={hasActiveDiscoverFilters}
          onFlame={handleDiscoverFlame}
          onICrush={handleDiscoverICrush}
          onPostLike={handleDiscoverPostLike}
          onProfileClick={(p) => setDiscoverProfile(p)}
          onPaidChat={(profile) => void handlePaidChat(profile)}
          onDismissMatchToast={dismissMatchToast}
          onMatchGreeting={handleDiscoverMatchGreeting}
          onRetry={() => void refetchDiscover()}
        />
      ) : activeConversation?.conversationKind === 'notifications' ? (
        <NotificationThread
          notifications={notifications}
          isLoading={notificationsLoading}
          error={notificationsError}
          likedProfileIds={likedIds}
          onBack={() => setActiveId(null)}
          onLikeBack={handleNotificationLikeBack}
          onChat={(profileId) => openChatWithProfile(profileId)}
          onMarkRead={handleMarkNotificationsRead}
          onRetry={() => void refetchNotifications()}
          onProfileClick={(item) => {
            if (item.actorUserId) setNotificationProfileId(item.actorUserId);
          }}
        />
      ) : activeId === LAVEY_OFFICIAL_CONVERSATION_ID ||
        (activeConversation && isLaveyOfficialConversation(activeConversation.id)) ? (
        <LaveyPromoThread onBack={() => setActiveId(null)} onRead={handleLaveyPromoRead} />
      ) : isICrushActive && activeConversation ? (
        <ICrushThread
          conversation={activeConversation}
          isResponding={iCrushResponding}
          onBack={() => setActiveId(null)}
          onProfileClick={() => openProfile(activeConversation)}
          onAccept={handleAcceptICrush}
          onReject={handleRejectICrush}
        />
      ) : activeConversation ? (
        <ChatThread
          conversation={activeConversation}
          messages={messages}
          isLoading={threadLoading}
          isSending={isSending}
          onBack={() => setActiveId(null)}
          onSend={(text, replyTo) => void sendMessage(text, replyTo)}
          onSendPhoto={sendPhoto}
          onSendAudio={sendAudio}
          onTypingChange={notifyTyping}
          onProfileClick={() => openProfile(activeConversation)}
          onVideoCall={() => void startVideoCall(activeConversation)}
          isVideoCallStarting={videoCallBusy}
          onReact={(messageId, emoji) => void reactToMessage(messageId, emoji)}
          onDeleteMessage={async (messageId, scope) => {
            await deleteMessage(messageId, scope);
            showActionToast(
              scope === 'for_both' ? 'Message unsent for everyone' : 'Message removed for you',
              true,
            );
          }}
          onConversationAction={handleConversationAction}
          isMuted={activeConversation ? mutedConversationIds.has(activeConversation.id) : false}
        />
      ) : (
        <div className="messages-page">
          <div className="messages-page__hero" aria-hidden />
          <div className="messages-page__watermark" aria-hidden>
            <img src={APP_IMAGES.logo} alt="" className="messages-page__watermark-logo" />
          </div>
          <div className="messages-page__sticky">
            <MessagesHeader
              unreadTotal={unreadTotal}
              matchCount={matchConversations.length}
              filter={filter}
              filterCounts={filterCounts}
              onFilterChange={setFilter}
              onComposeClick={() => {
                setFindOpen(false);
                setDiscoverOpen(true);
              }}
            />
          </div>

          <PageScroller className="messages-page__scroll">
            {isLoading && <PageTransitionSplash />}
            {error && <FeedState message={error} onRetry={() => void refetch()} />}

            {!isLoading && !error && (
              <>
                {showOnlineStrip ? (
                  <div className="messages-page__strips">
                    <OnlineMatchesStrip
                      conversations={onlineStripConversations}
                      onSelect={setActiveId}
                      onAvatarClick={(conversation) => setActiveId(conversation.id)}
                      title="Online now"
                    />
                  </div>
                ) : null}

                {listConversations.length === 0 && !hasStripContent ? (
                  <div
                    className={`messages-page__empty messages-page__empty--${filter === 'all' ? 'none' : filter}`}
                  >
                    {filter === 'all' && (
                      <span className="messages-page__empty-icon" aria-hidden>
                        <span className="messages-page__empty-emoji">💬</span>
                      </span>
                    )}
                    <h2 className="messages-page__empty-title">
                      {conversations.length === 0
                        ? 'No matches yet'
                        : filter === 'online'
                          ? 'No one online'
                          : filter === 'unread'
                            ? 'All caught up'
                            : 'Nothing here'}
                    </h2>
                    <p className="messages-page__empty-text">
                      {conversations.length === 0
                        ? 'Like people on For You to start chatting'
                        : filter === 'online'
                          ? 'None of your matches are online right now'
                          : filter === 'unread'
                            ? 'You have no unread messages'
                            : 'No conversations found'}
                    </p>
                    {filter !== 'all' && (
                      <button
                        type="button"
                        className="messages-page__empty-btn"
                        onClick={() => setFilter('all')}
                      >
                        Show all chats
                      </button>
                    )}
                  </div>
                ) : listConversations.length > 0 ? (
                  <div className="messages-page__list">
                    {filter === 'unread' ? (
                      <h2 className="messages-page__list-title">Unread</h2>
                    ) : null}
                    {listConversations.map((c) => (
                      <ConversationListItem
                        key={c.id}
                        conversation={c}
                        onClick={() => setActiveId(c.id)}
                        onAvatarClick={() =>
                          c.conversationKind === 'notifications' ||
                          c.conversationKind === 'lavey_official'
                            ? setActiveId(c.id)
                            : openProfile(c)
                        }
                        onMoreClick={
                          c.conversationKind === 'notifications' ||
                          c.conversationKind === 'lavey_official' ||
                          isICrushConversation(c)
                            ? undefined
                            : () => openOptionsSheet(c)
                        }
                      />
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </PageScroller>
        </div>
      )}

      <DiscoveryPhoneSearchSheet
        open={phoneSearchOpen}
        onClose={() => setPhoneSearchOpen(false)}
        onSearch={handlePhoneSearch}
      />

      <DiscoverFilterSheet
        open={discoverFiltersOpen}
        filters={discoverFilters}
        onClose={() => setDiscoverFiltersOpen(false)}
        onApply={setDiscoverFilters}
        onReset={resetDiscoverFilters}
      />

      <PaidChatSheet
        profile={paidChatProfile}
        onClose={() => setPaidChatProfile(null)}
        onUnlocked={() => {
          const profileId = paidChatProfile?.id;
          setPaidChatProfile(null);
          setFindOpen(false);
          setDiscoverOpen(false);
          if (profileId) openChatWithProfile(profileId);
        }}
      />

      <MatchProfileModal
        open={notificationProfileId !== null}
        mode="discover"
        profile={notificationProfile}
        liked={notificationProfile ? likedIds.has(notificationProfile.id) : false}
        likedYou={notificationProfile?.likedYou ?? false}
        isLoading={notificationProfileLoading}
        isSubmittingFlame={isFlameSubmitting}
        onClose={() => setNotificationProfileId(null)}
        onFlame={() => {
          if (!notificationProfile || likedIds.has(notificationProfile.id)) return;
          void sendFlame(notificationProfile.id);
        }}
      />

      <MatchProfileModal
        open={profileConversation !== null}
        mode="messages"
        profile={profile}
        conversation={profileConversation}
        isLoading={profileLoading}
        onClose={closeProfile}
        onMessage={handleMessageFromProfile}
        onSendMessage={handleSendMessageFromProfile}
      />

      <MatchProfileModal
        open={discoverProfile !== null}
        mode="discover"
        profile={discoverProfile}
        liked={discoverProfile ? likedIds.has(discoverProfile.id) : false}
        likedYou={discoverProfile?.likedYou ?? false}
        isLoading={false}
        isSubmittingFlame={isFlameSubmitting}
        onClose={() => setDiscoverProfile(null)}
        onFlame={handleDiscoverProfileFlame}
      />

      <ConversationOptionsSheet
        open={optionsTarget !== null}
        conversation={optionsTarget}
        onClose={closeOptionsSheet}
        onToggleStar={handleToggleStar}
        onDeleteChat={() => optionsTarget && openDeleteSheet(optionsTarget)}
      />

      {deleteTarget && (
        <DeleteChatSheet
          open={deleteTarget !== null}
          participantName={deleteTarget.participantName}
          participantAvatar={deleteTarget.participantAvatar}
          onClose={closeDeleteSheet}
          onDelete={handleDeleteChat}
        />
      )}

      {actionToast ? (
        <div
          className={`messages-page__toast ${actionToast.success ? 'messages-page__toast--success' : ''}`}
          role="status"
        >
          {actionToast.success ? (
            <span className="messages-page__toast-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
          ) : null}
          <span>{actionToast.text}</span>
        </div>
      ) : null}

      {incomingVideoCall && !activeVideoCall ? (
        <IncomingVideoCall
          call={incomingVideoCall}
          busy={videoCallBusy}
          onAnswer={() => void answerVideoCall()}
          onDecline={() => void declineVideoCall()}
        />
      ) : null}

      {activeVideoCall ? (
        <DirectVideoCall call={activeVideoCall} onEnd={() => void endVideoCall()} />
      ) : null}
    </>
  );
}
