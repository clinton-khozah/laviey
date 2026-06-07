import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  getSupportConfig,
  getSupportConversation,
  sendSupportMessage,
} from '../services/support.service.js';
import { successResponse } from '../utils/apiResponse.js';

const sendMessageBodySchema = z.object({
  body: z.string().min(1).max(4000),
});

export const supportController = {
  async getConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    const config = await getSupportConfig(req.accessToken!);
    res.json(successResponse(config));
  },

  async getConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    const conversation = await getSupportConversation(req.authUser!, req.accessToken!);
    res.json(successResponse(conversation));
  },

  async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = sendMessageBodySchema.parse(req.body);
    const conversation = await sendSupportMessage(req.authUser!, req.accessToken!, body.body);
    res.json(successResponse(conversation));
  },
};
