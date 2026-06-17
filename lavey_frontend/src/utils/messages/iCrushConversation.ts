import type { Conversation } from '@/types';

export function isICrushConversation(conversation: Conversation): boolean {
  return (
    conversation.conversationKind === 'i_crush_incoming' ||
    conversation.conversationKind === 'i_crush_outgoing'
  );
}

export function isICrushIncoming(conversation: Conversation): boolean {
  return conversation.conversationKind === 'i_crush_incoming';
}
