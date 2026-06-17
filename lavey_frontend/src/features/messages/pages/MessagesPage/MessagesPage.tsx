import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConversationListItem } from '@/components/messages/ConversationListItem';
import { ChatThread } from '@/components/messages/ChatThread';
import { ICrushThread } from '@/components/messages/ICrushThread';
import { NotificationThread } from '@/components/messages/NotificationThread';
import type { ChatConversationAction } from '@/components/messages/ChatSendOptionsMenu';
import { MatchProfileModal } from '@/components/messages/MatchProfileModal';
import { MessagesDiscoverPage } from '@/components/messages/MessagesDiscoverPage';
import { MessagesHeader, type MessageFilter } from '@/components/messages/MessagesHeader';
import { MatchAvatarsStrip, OnlineMatchesStrip } from '@/components/messages/MessageMatchStrip';
import { PageScroller } from '@/components/layout/PageScroller';
import { FeedState } from '@/components/ui/FeedState';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { ConversationOptionsSheet } from '@/components/messages/ConversationOptionsSheet';
import { DeleteChatSheet } from '@/components/messages/DeleteChatSheet';
import { APP_IMAGES } from '@/constants/images';
import { NOTIFICATIONS_CONVERSATION_ID } from '@/constants/notifications';
import { useChatThread, useConversations, useMatchProfile, useMatchActions, useNotificationInbox, useMessagesDiscoverSuggestions, useMessagesFindSuggestions, useDiscoverFilters } from '@/hooks';
import { messageService, matchService } from '@/services';
import { privacyService } from '@/services/privacy/privacyService';
import type { Conversation, DeleteConversationScope, Profile } from '@/types';
import { isMatchConversation, sortConversations } from '@/utils/messages/sortConversations';
import { isICrushConversation } from '@/utils/messages/iCrushConversation';
import { openChatWithProfile } from '@/utils/navigation/appNav';
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

  const showActionToast = useCallback((message: string, success = false) => {
    setActionToast({ text: message, success });
    window.setTimeout(() => setActionToast(null), 2600);
  }, []);

  const {
    messages,
    isLoading: threadLoading,
    isSending,
    sendMessage,
    sendPhoto,
    notifyTyping,
    reactToMessage,
    deleteMessage,
  } = useChatThread(
    !activeId || activeId === NOTIFICATIONS_CONVERSATION_ID || activeId.startsWith('icrush-')
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

  const { filters: discoverFilters } = useDiscoverFilters();

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

  const matchStripConversations = useMemo(() => {
    const seen = new Set<string>();
    const ordered: Conversation[] = [];

    for (const conversation of matchConversations) {
      if (!conversation.isOnline || seen.has(conversation.id)) continue;
      seen.add(conversation.id);
      ordered.push(conversation);
    }

    for (const conversation of sortedConversations) {
      if (!isMatchConversation(conversation) || seen.has(conversation.id)) continue;
      seen.add(conversation.id);
      ordered.push(conversation);
    }

    return ordered;
  }, [matchConversations, sortedConversations]);

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
    if (filter === 'all') {
      return sortedConversations.filter((conversation) => !isMatchConversation(conversation));
    }
    return filtered;
  }, [filter, filtered, sortedConversations]);

  const showMatchStrip = filter === 'all' && matchStripConversations.length > 0;
  const showOnlineStrip = filter === 'online' && onlineStripConversations.length > 0;
  const hasStripContent = showMatchStrip || showOnlineStrip;

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
        showActionToast(`Report submitted for ${activeConversation.participantName}`);
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
          profiles={findProfiles}
          likedIds={likedIds}
          likedPostIds={likedPostIds}
          iCrushSentIds={iCrushSentIds}
          matchToast={matchToast}
          isLoading={findLoading}
          error={findError}
          onBack={() => setFindOpen(false)}
          onFlame={handleDiscoverFlame}
          onICrush={handleDiscoverICrush}
          onPostLike={handleDiscoverPostLike}
          onProfileClick={(p) => setDiscoverProfile(p)}
          onDismissMatchToast={dismissMatchToast}
          onMatchGreeting={handleFindMatchGreeting}
          onRetry={() => void refetchFind()}
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
          onFindClick={() => setFindOpen(true)}
          onFlame={handleDiscoverFlame}
          onICrush={handleDiscoverICrush}
          onPostLike={handleDiscoverPostLike}
          onProfileClick={(p) => setDiscoverProfile(p)}
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
          onSend={(text) => void sendMessage(text)}
          onSendPhoto={sendPhoto}
          onTypingChange={notifyTyping}
          onProfileClick={() => openProfile(activeConversation)}
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
                {showMatchStrip ? (
                  <div className="messages-page__strips">
                    <MatchAvatarsStrip
                      conversations={matchStripConversations}
                      onSelect={setActiveId}
                      onAvatarClick={openProfile}
                    />
                  </div>
                ) : null}

                {showOnlineStrip ? (
                  <div className="messages-page__strips">
                    <OnlineMatchesStrip
                      conversations={onlineStripConversations}
                      onSelect={setActiveId}
                      onAvatarClick={openProfile}
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
                          c.conversationKind === 'notifications' ? setActiveId(c.id) : openProfile(c)
                        }
                        onMoreClick={
                          c.conversationKind === 'notifications' || isICrushConversation(c)
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
    </>
  );
}
