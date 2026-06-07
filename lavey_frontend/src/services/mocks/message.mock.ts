import type { ChatMessage, Conversation } from '@/types';
import { pickMockAvatar } from '@/constants/mockMedia';

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    participantProfileId: '1',
    participantName: 'Maya',
    participantAvatar: pickMockAvatar(0),
    lastMessage: 'That hike spot looks incredible! 🏔️',
    lastMessageAt: '2m ago',
    unreadCount: 2,
    isOnline: true,
    isTyping: false,
    matchedAt: 'Yesterday',
    vibeScore: 94,
    isPinned: true,
  },
  {
    id: 'c2',
    participantProfileId: '2',
    participantName: 'Jordan',
    participantAvatar: pickMockAvatar(1),
    lastMessage: 'Down for a collab this weekend?',
    lastMessageAt: '1h ago',
    unreadCount: 0,
    isOnline: true,
    isTyping: true,
    matchedAt: '2 days ago',
    vibeScore: 88,
  },
  {
    id: 'c3',
    participantProfileId: '3',
    participantName: 'Sofia',
    participantAvatar: pickMockAvatar(2),
    lastMessage: 'Sent you an E-Coffee ☕',
    lastMessageAt: 'Yesterday',
    unreadCount: 0,
    isOnline: false,
    lastSeenLabel: 'Last seen 2h ago',
    matchedAt: '3 days ago',
    vibeScore: 91,
  },
  {
    id: 'c4',
    participantProfileId: '4',
    participantName: 'Alex',
    participantAvatar: pickMockAvatar(3),
    lastMessage: 'See you in the Vibe Room tonight?',
    lastMessageAt: 'Mon',
    unreadCount: 1,
    isOnline: false,
    matchedAt: 'Last week',
    vibeScore: 86,
  },
];

export const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  c1: [
    { id: 'm1', conversationId: 'c1', senderId: 'them', text: 'Hey! Loved your vibe video 🎬', sentAt: '10:02 AM', read: true },
    { id: 'm2', conversationId: 'c1', senderId: 'me', text: 'Thanks! Your dog content is adorable', sentAt: '10:05 AM', read: true },
    { id: 'm3', conversationId: 'c1', senderId: 'them', text: 'That hike spot looks incredible! 🏔️', sentAt: '10:12 AM', read: false },
  ],
  c2: [
    { id: 'm4', conversationId: 'c2', senderId: 'them', text: 'Your karaoke duet was fire', sentAt: '9:30 AM', read: true },
    { id: 'm5', conversationId: 'c2', senderId: 'me', text: 'Haha we should do another', sentAt: '9:45 AM', read: true },
    { id: 'm6', conversationId: 'c2', senderId: 'them', text: 'Down for a collab this weekend?', sentAt: '11:00 AM', read: true },
  ],
  c3: [
    { id: 'm7', conversationId: 'c3', senderId: 'me', text: 'Want to grab coffee?', sentAt: 'Yesterday', read: true },
    { id: 'm8', conversationId: 'c3', senderId: 'them', text: 'Sent you an E-Coffee ☕', sentAt: 'Yesterday', read: true },
  ],
  c4: [
    { id: 'm9', conversationId: 'c4', senderId: 'them', text: 'Joining the climbing room later', sentAt: 'Mon', read: true },
    { id: 'm10', conversationId: 'c4', senderId: 'them', text: 'See you in the Vibe Room tonight?', sentAt: 'Mon', read: false },
  ],
};
