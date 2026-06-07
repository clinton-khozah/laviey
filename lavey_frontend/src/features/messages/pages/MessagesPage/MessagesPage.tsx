import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConversationListItem } from '@/components/messages/ConversationListItem';
import { ChatThread } from '@/components/messages/ChatThread';
import type { ChatConversationAction } from '@/components/messages/ChatSendOptionsMenu';
import { MatchProfileModal } from '@/components/messages/MatchProfileModal';
import { MessagesHeader } from '@/components/messages/MessagesHeader';
import { MessageFilters, type MessageFilter } from '@/components/messages/MessageFilters';
import { OnlineMatchesStrip } from '@/components/messages/OnlineMatchesStrip';
import { PageScroller } from '@/components/layout/PageScroller';
import { FeedState } from '@/components/ui/FeedState';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { ConversationOptionsSheet } from '@/components/messages/ConversationOptionsSheet';
import { DeleteChatSheet } from '@/components/messages/DeleteChatSheet';
import { useChatThread, useConversations, useMatchProfile } from '@/hooks';
import { messageService } from '@/services';
import { privacyService } from '@/services/privacy/privacyService';
import type { Conversation, DeleteConversationScope } from '@/types';
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
  const [activeId, setActiveId] = useState<string | null>(null);
  // Used to auto-send a greeting from `MatchProfileModal` after we switch into the chat.
  const [pendingAutoMessage, setPendingAutoMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<MessageFilter>('all');
  const [profileConversation, setProfileConversation] = useState<Conversation | null>(null);
  const [optionsTarget, setOptionsTarget] = useState<Conversation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [mutedConversationIds, setMutedConversationIds] = useState<Set<string>>(() => new Set());
  const [actionToast, setActionToast] = useState<string | null>(null);

  const showActionToast = useCallback((message: string) => {
    setActionToast(message);
    window.setTimeout(() => setActionToast(null), 2600);
  }, []);

  const {
    messages,
    isLoading: threadLoading,
    isSending,
    sendMessage,
    notifyTyping,
    reactToMessage,
    deleteMessage,
  } = useChatThread(activeId);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  useEffect(() => {
    if (!activeId) return;
    const intervalId = window.setInterval(() => void refetch(true), 4000);
    return () => window.clearInterval(intervalId);
  }, [activeId, refetch]);

  const { profile, isLoading: profileLoading } = useMatchProfile(
    profileConversation?.participantProfileId ?? null,
  );

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const filterCounts = useMemo(
    () => ({
      all: conversations.length,
      unread: conversations.filter((c) => c.unreadCount > 0).length,
      online: conversations.filter((c) => c.isOnline).length,
    }),
    [conversations],
  );

  const filtered = useMemo(() => {
    let list = [...conversations];

    if (filter === 'unread') list = list.filter((c) => c.unreadCount > 0);
    if (filter === 'online') list = list.filter((c) => c.isOnline);

    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      return 0;
    });
  }, [conversations, filter]);

  const openProfile = (conversation: Conversation) => {
    setProfileConversation(conversation);
  };

  const closeProfile = () => setProfileConversation(null);

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

  return (
    <>
      {activeConversation ? (
        <ChatThread
          conversation={activeConversation}
          messages={messages}
          isLoading={threadLoading}
          isSending={isSending}
          onBack={() => setActiveId(null)}
          onSend={(text) => void sendMessage(text)}
          onTypingChange={notifyTyping}
          onProfileClick={() => openProfile(activeConversation)}
          onReact={(messageId, emoji) => void reactToMessage(messageId, emoji)}
          onDeleteMessage={(messageId, scope) => void deleteMessage(messageId, scope)}
          onConversationAction={handleConversationAction}
          isMuted={activeConversation ? mutedConversationIds.has(activeConversation.id) : false}
        />
      ) : (
        <div className="messages-page">
          <div className="messages-page__sticky">
            <MessagesHeader unreadTotal={unreadTotal} matchCount={conversations.length} />
            <MessageFilters active={filter} onChange={setFilter} counts={filterCounts} />
          </div>

          <PageScroller className="messages-page__scroll">
            {isLoading && <PageTransitionSplash />}
            {error && <FeedState message={error} onRetry={() => void refetch()} />}

            {!isLoading && !error && (
              <>
                {filter === 'all' && (
                  <OnlineMatchesStrip
                    conversations={conversations}
                    onSelect={setActiveId}
                    onAvatarClick={openProfile}
                  />
                )}

                {filtered.length === 0 ? (
                  <div className="messages-page__empty">
                    <span className="messages-page__empty-icon" aria-hidden>
                      💬
                    </span>
                    <p>
                      {conversations.length === 0
                        ? 'No matches yet — like people on For You to start chatting'
                        : 'No conversations found'}
                    </p>
                    {filter !== 'all' && (
                      <button type="button" onClick={() => setFilter('all')}>
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="messages-page__list">
                    <h2 className="messages-page__list-title">
                      {filtered.some((c) => c.isPinned) ? 'Starred & recent' : 'Recent'}
                    </h2>
                    {filtered.map((c) => (
                      <ConversationListItem
                        key={c.id}
                        conversation={c}
                        onClick={() => setActiveId(c.id)}
                        onAvatarClick={() => openProfile(c)}
                        onMoreClick={() => openOptionsSheet(c)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </PageScroller>
        </div>
      )}

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

      {actionToast && (
        <div className="messages-page__toast" role="status">
          {actionToast}
        </div>
      )}
    </>
  );
}
