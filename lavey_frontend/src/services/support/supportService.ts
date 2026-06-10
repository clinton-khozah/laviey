import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse } from '@/types';
import { sleep } from '@/utils/sleep';

export interface SupportConfig {
  displayName: string;
  statusText: string;
  welcomeMessage: string;
  quickTopics: string[];
}

export interface SupportMessage {
  id: string;
  sender: 'me' | 'support';
  text: string;
  sentAt: string;
  isAutoReply?: boolean;
}

export interface SupportConversation {
  conversationId: string;
  status: string;
  messages: SupportMessage[];
  config: SupportConfig;
}

const MOCK_CONFIG: SupportConfig = {
  displayName: 'Lavey Support',
  statusText: "We're here to help",
  welcomeMessage:
    "Hi! 👋 We're the Lavey team. Tell us what's going on — we usually reply within a few hours.",
  quickTopics: [
    'Account help',
    'Billing & Platinum',
    'Safety or reporting',
    'Bug or app issue',
  ],
};

const MOCK_AUTO_REPLY =
  'Thanks for reaching out. A member of our team has received your message and will get back to you at the email on your account, usually within a few hours.';

function usesBackendSupport(): boolean {
  return usesBackendApi();
}

export const supportService = {
  async getConversation(): Promise<SupportConversation> {
    if (!usesBackendSupport()) {
      await sleep(200);
      return {
        conversationId: 'mock',
        status: 'open',
        config: MOCK_CONFIG,
        messages: [
          {
            id: 'welcome',
            sender: 'support',
            text: MOCK_CONFIG.welcomeMessage,
            sentAt: 'Just now',
          },
        ],
      };
    }

    const res = await httpClient.get<ApiResponse<SupportConversation>>(
      API_ENDPOINTS.support.conversation,
    );
    return res.data;
  },

  async sendMessage(body: string): Promise<SupportConversation> {
    const trimmed = body.trim();
    if (!trimmed) throw new Error('Message cannot be empty');

    if (!usesBackendSupport()) {
      await sleep(400);
      const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const prior = await supportService.getConversation();
      const hadUserMessage = prior.messages.some((m) => m.sender === 'me');
      const nextMessages: SupportMessage[] = [
        ...prior.messages,
        { id: `u-${Date.now()}`, sender: 'me', text: trimmed, sentAt: now },
      ];
      if (!hadUserMessage) {
        nextMessages.push({
          id: `s-${Date.now()}`,
          sender: 'support',
          text: MOCK_AUTO_REPLY,
          sentAt: now,
          isAutoReply: true,
        });
      }
      return { ...prior, messages: nextMessages };
    }

    const res = await httpClient.post<ApiResponse<SupportConversation>>(
      API_ENDPOINTS.support.messages,
      { body: { body: trimmed } },
    );
    return res.data;
  },
};
