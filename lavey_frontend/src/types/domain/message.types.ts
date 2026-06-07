export interface Conversation {
  id: string;
  /** Links to discover `Profile.id` for full match profile modal */
  participantProfileId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline: boolean;
  isTyping?: boolean;
  /** Pre-formatted when offline, e.g. "Last seen 5m ago" */
  lastSeenLabel?: string | null;
  /** ISO last activity (optional, for client-side refresh) */
  lastSeenAt?: string | null;
  matchedAt: string;
  vibeScore: number;
  isPinned?: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: 'me' | 'them';
  text: string;
  sentAt: string;
  read: boolean;
  /** Emoji reaction on this message */
  reaction?: string;
}

/** Hide locally, or remove for both participants */
export type DeleteConversationScope = 'for_you' | 'for_both';

export type DeleteMessageScope = DeleteConversationScope;
