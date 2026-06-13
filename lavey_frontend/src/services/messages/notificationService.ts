import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { NOTIFICATIONS_CONVERSATION_ID } from '@/constants/notifications';
import { httpClient } from '@/services/api/httpClient';
import { MOCK_PROFILES } from '@/services/mocks/profile.mock';
import type { ApiResponse, Conversation, NotificationEvent } from '@/types';
import { sleep } from '@/utils/sleep';

function buildMockNotifications(): NotificationEvent[] {
  const likes = MOCK_PROFILES.filter((profile) => profile.likedYou).map((profile, index) => ({
    id: `notif-mock-${profile.id}`,
    actorUserId: profile.id,
    actorName: profile.name,
    actorAvatar: profile.avatar,
    kind: (index % 2 === 0 ? 'crush' : 'like') as NotificationEvent['kind'],
    title: null,
    body: null,
    text:
      index % 2 === 0
        ? `${profile.name.split(' ')[0]} crushed on you`
        : `${profile.name.split(' ')[0]} liked you`,
    sentAt: index === 0 ? 'Just now' : `${index + 1}h ago`,
    read: index > 1,
    actionable: true,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }));

  return [
    {
      id: 'notif-mock-verified',
      actorUserId: null,
      actorName: 'Lavey',
      actorAvatar: '',
      kind: 'verified',
      title: "You're verified!",
      body: 'Congratulations — your identity is verified. Your profile now shows the blue badge.',
      text: 'Congratulations — your identity is verified. Your profile now shows the blue badge.',
      sentAt: '10:30 AM',
      read: false,
      actionable: false,
      expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
    },
    ...likes,
  ];
}

function buildSummaryFromEvents(events: NotificationEvent[]): Conversation {
  const latest = events[0];
  const unreadCount = events.filter((event) => !event.read).length;

  return {
    id: NOTIFICATIONS_CONVERSATION_ID,
    conversationKind: 'notifications',
    participantProfileId: 'notifications',
    participantName: 'Notifications',
    participantAvatar: '',
    lastMessage: latest?.text ?? 'Likes, crushes & updates appear here',
    lastMessageAt: latest?.sentAt ?? '',
    unreadCount,
    isOnline: false,
    matchedAt: '',
    vibeScore: 0,
    isPinned: true,
  };
}

export const notificationService = {
  async listNotifications(): Promise<NotificationEvent[]> {
    if (!usesBackendApi()) {
      await sleep(200);
      return buildMockNotifications();
    }

    const res = await httpClient.get<ApiResponse<NotificationEvent[]>>(
      API_ENDPOINTS.messages.notifications,
    );
    return res.data;
  },

  async getSummary(): Promise<Conversation> {
    if (!usesBackendApi()) {
      await sleep(150);
      return buildSummaryFromEvents(buildMockNotifications());
    }

    const res = await httpClient.get<ApiResponse<Conversation>>(
      API_ENDPOINTS.messages.notificationsSummary,
    );
    return res.data;
  },

  async markRead(): Promise<void> {
    if (!usesBackendApi()) {
      await sleep(100);
      return;
    }

    await httpClient.post<ApiResponse<{ ok: boolean }>>(
      API_ENDPOINTS.messages.notificationsRead,
      {},
    );
  },
};
