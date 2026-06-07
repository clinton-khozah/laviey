import { env, usesBackendAuth } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '@/services/mocks/message.mock';
import type {
  ApiResponse,
  ChatMessage,
  Conversation,
  DeleteConversationScope,
  DeleteMessageScope,
} from '@/types';
import {
  isConversationHidden,
  markConversationDeleted,
} from '@/utils/messages/deletedChatsStorage';
import {
  applyMessageMeta,
  markMessageDeleted,
  setMessageReaction as persistMessageReaction,
} from '@/utils/messages/messageMetaStorage';
import {
  applyPinnedState,
  setConversationPinned as persistConversationPinned,
} from '@/utils/messages/pinnedChatsStorage';
import { sleep } from '@/utils/sleep';

function usesBackendMessages(): boolean {
  return usesBackendAuth() && !env.useMockApi;
}

function filterVisibleConversations(conversations: Conversation[]): Conversation[] {
  return conversations.filter((c) => !isConversationHidden(c.id));
}

export const messageService = {
  async getConversations(): Promise<Conversation[]> {
    if (!usesBackendMessages()) {
      await sleep(300);
      return applyPinnedState(filterVisibleConversations(MOCK_CONVERSATIONS));
    }

    const res = await httpClient.get<ApiResponse<Conversation[]>>(
      API_ENDPOINTS.messages.conversations,
    );
    return res.data;
  },

  async findConversationByProfileId(profileId: string): Promise<string | null> {
    if (!usesBackendMessages()) {
      return MOCK_CONVERSATIONS.find((c) => c.participantProfileId === profileId)?.id ?? null;
    }

    const res = await httpClient.get<ApiResponse<{ conversationId: string | null }>>(
      API_ENDPOINTS.messages.conversationByProfile(profileId),
    );
    return res.data.conversationId;
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    if (!usesBackendMessages()) {
      await sleep(250);
      if (isConversationHidden(conversationId)) return [];
      const base = MOCK_MESSAGES[conversationId] ?? [];
      return applyMessageMeta(conversationId, base);
    }

    const res = await httpClient.get<ApiResponse<ChatMessage[]>>(
      API_ENDPOINTS.messages.thread(conversationId),
    );
    return res.data;
  },

  async sendMessage(conversationId: string, text: string): Promise<ChatMessage> {
    if (!usesBackendMessages()) {
      await sleep(200);
      return {
        id: `m-${Date.now()}`,
        conversationId,
        senderId: 'me',
        text,
        sentAt: 'Just now',
        read: true,
      };
    }

    const res = await httpClient.post<ApiResponse<ChatMessage>>(
      API_ENDPOINTS.messages.sendMessage(conversationId),
      { body: { text } },
    );
    return res.data;
  },

  async markConversationRead(conversationId: string): Promise<void> {
    if (!usesBackendMessages()) return;
    await httpClient.post(API_ENDPOINTS.messages.markRead(conversationId), {});
  },

  async setTyping(conversationId: string, isTyping: boolean): Promise<void> {
    if (!usesBackendMessages()) return;
    await httpClient.post(API_ENDPOINTS.messages.typing(conversationId), {
      body: { isTyping },
    });
  },

  async touchPresence(): Promise<void> {
    if (!usesBackendMessages()) return;
    await httpClient.post(API_ENDPOINTS.messages.presence, {});
  },

  async setConversationPinned(conversationId: string, pinned: boolean): Promise<void> {
    if (!usesBackendMessages()) {
      await sleep(100);
      persistConversationPinned(conversationId, pinned);
      return;
    }

    await httpClient.patch(API_ENDPOINTS.messages.pin(conversationId), {
      body: { pinned },
    });
  },

  async deleteConversation(
    conversationId: string,
    scope: DeleteConversationScope,
  ): Promise<void> {
    if (!usesBackendMessages()) {
      await sleep(200);
      markConversationDeleted(conversationId, scope);
      return;
    }

    if (scope === 'for_you') {
      await httpClient.delete(API_ENDPOINTS.messages.delete(conversationId));
      return;
    }

    await httpClient.delete(API_ENDPOINTS.messages.delete(conversationId), {
      body: { scope },
    });
  },

  async setMessageReaction(
    conversationId: string,
    messageId: string,
    emoji: string | null,
  ): Promise<void> {
    if (!usesBackendMessages()) {
      await sleep(100);
      persistMessageReaction(conversationId, messageId, emoji);
      return;
    }

    await httpClient.patch(API_ENDPOINTS.messages.message(conversationId, messageId), {
      body: { reaction: emoji },
    });
  },

  async deleteMessage(
    conversationId: string,
    messageId: string,
    scope: DeleteMessageScope,
  ): Promise<void> {
    if (!usesBackendMessages()) {
      await sleep(150);
      markMessageDeleted(conversationId, messageId, scope);
      return;
    }

    await httpClient.delete(API_ENDPOINTS.messages.message(conversationId, messageId), {
      body: { scope },
    });
  },
};
