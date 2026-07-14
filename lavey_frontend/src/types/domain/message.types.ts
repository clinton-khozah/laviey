export type ConversationKind = 'match' | 'notifications' | 'lavey_official' | 'i_crush_incoming' | 'i_crush_outgoing';

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
  conversationKind?: ConversationKind;
  /** Present when conversationKind is i_crush_* */
  iCrushInviteId?: string;
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
  /** Text (default), ephemeral photo, or voice message. */
  kind?: 'text' | 'image' | 'audio';
  /** Short-lived signed URL for chat photos */
  imageUrl?: string;
  /** Short-lived signed URL for a private voice message. */
  audioUrl?: string;
  /** ISO expiry — photos auto-delete after 24h */
  expiresAt?: string;
  /** Photo TTL passed — content removed server-side */
  expired?: boolean;
  /** Optimistic upload in progress */
  sending?: boolean;
  /** Original message quoted by this reply. */
  replyTo?: {
    id: string;
    senderId: 'me' | 'them';
    text: string;
    kind: 'text' | 'image' | 'audio';
  };
}

/** Hide locally, or remove for both participants */
export type DeleteConversationScope = 'for_you' | 'for_both';

export type DeleteMessageScope = DeleteConversationScope;

export type ChatVideoCallStatus = 'ringing' | 'active' | 'declined' | 'ended' | 'missed';
export type ChatVideoCallAction = 'answer' | 'decline' | 'end';

export interface ChatVideoCall {
  id: string;
  conversationId: string;
  callerUserId: string;
  calleeUserId: string;
  direction: 'incoming' | 'outgoing';
  status: ChatVideoCallStatus;
  createdAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  participantName: string;
  participantAvatar: string;
}
