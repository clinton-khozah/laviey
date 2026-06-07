import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  findConversationByProfileId,
  getConversationThread,
  hideConversation,
  listConversations,
  markConversationRead,
  sendChatMessage,
  setConversationPinned,
  setMessageReaction,
  setTypingState,
  touchUserPresence,
} from '../services/chat.service.js';
import { successResponse } from '../utils/apiResponse.js';

const sendMessageSchema = z.object({
  text: z.string().min(1).max(4000),
});

const typingSchema = z.object({
  isTyping: z.boolean(),
});

const pinSchema = z.object({
  pinned: z.boolean(),
});

const reactionSchema = z.object({
  reaction: z.union([z.string().min(1).max(16), z.null()]),
});

export const messagesController = {
  async getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
    const conversations = await listConversations(req.authUser!, req.accessToken!);
    res.json(successResponse(conversations));
  },

  async getThread(req: AuthenticatedRequest, res: Response): Promise<void> {
    const conversationId =
      typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const messages = await getConversationThread(req.authUser!, req.accessToken!, conversationId);
    res.json(successResponse(messages));
  },

  async setMessageReaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    const conversationId =
      typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const messageId =
      typeof req.params.messageId === 'string'
        ? req.params.messageId
        : req.params.messageId[0];
    const body = reactionSchema.parse(req.body);
    const message = await setMessageReaction(
      req.authUser!,
      req.accessToken!,
      conversationId,
      messageId,
      body.reaction,
    );
    res.json(successResponse(message));
  },

  async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    const conversationId =
      typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const body = sendMessageSchema.parse(req.body);
    const message = await sendChatMessage(
      req.authUser!,
      req.accessToken!,
      conversationId,
      body.text,
    );
    res.status(201).json(successResponse(message, 'Message sent'));
  },

  async markRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const conversationId =
      typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    await markConversationRead(req.authUser!, req.accessToken!, conversationId);
    res.json(successResponse({ read: true }));
  },

  async setTyping(req: AuthenticatedRequest, res: Response): Promise<void> {
    const conversationId =
      typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const body = typingSchema.parse(req.body);
    await setTypingState(req.authUser!, req.accessToken!, conversationId, body.isTyping);
    res.json(successResponse({ updated: true }));
  },

  async setPinned(req: AuthenticatedRequest, res: Response): Promise<void> {
    const conversationId =
      typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const body = pinSchema.parse(req.body);
    await setConversationPinned(req.authUser!, req.accessToken!, conversationId, body.pinned);
    res.json(successResponse({ pinned: body.pinned }));
  },

  async deleteConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    const conversationId =
      typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    await hideConversation(req.authUser!, req.accessToken!, conversationId);
    res.json(successResponse({ deleted: true }));
  },

  async touchPresence(req: AuthenticatedRequest, res: Response): Promise<void> {
    await touchUserPresence(req.authUser!, req.accessToken!);
    res.json(successResponse({ online: true }));
  },

  async findByProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const profileId =
      typeof req.params.profileId === 'string' ? req.params.profileId : req.params.profileId[0];
    const conversationId = await findConversationByProfileId(
      req.authUser!,
      req.accessToken!,
      profileId,
    );
    res.json(successResponse({ conversationId }));
  },
};
