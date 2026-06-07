import type { Conversation } from '@/types';

export function getChatHeaderStatus(conversation: Conversation): string {
  if (conversation.isTyping) return 'typing';
  if (conversation.isOnline) return 'Online';
  return conversation.lastSeenLabel ?? `Matched ${conversation.matchedAt}`;
}
