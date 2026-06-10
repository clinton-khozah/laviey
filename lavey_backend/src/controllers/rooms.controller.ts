import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  createOnlineDate,
  joinOnlineDate,
  joinOnlineDateByCode,
  listDateInvites,
  listOnlineDates,
  respondToDateInvite,
} from '../services/rooms.service.js';
import { successResponse } from '../utils/apiResponse.js';

const joinBodySchema = z.object({
  accessCode: z.string().min(1),
});

const joinByCodeBodySchema = z.object({
  accessCode: z.string().min(1),
});

const createDateBodySchema = z.object({
  title: z.string().min(1).max(120),
  topic: z.string().min(1).max(240),
  visibility: z.enum(['public', 'private']),
  mode: z.enum(['post', 'invite']),
  inviteToProfileId: z.string().uuid().optional(),
  inviteToName: z.string().max(80).optional(),
  startsInMinutes: z.number().int().min(0).max(10080),
});

const respondInviteBodySchema = z.object({
  action: z.enum(['accept', 'decline']),
});

export const roomsController = {
  async listVibeCheck(req: AuthenticatedRequest, res: Response): Promise<void> {
    const dates = await listOnlineDates(req.authUser!, req.accessToken!);
    res.json(successResponse(dates));
  },

  async joinVibeCheck(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = joinBodySchema.parse(req.body);
    const dateId = String(req.params.id);
    const result = await joinOnlineDate(req.authUser!, req.accessToken!, dateId, body.accessCode);
    res.json(successResponse(result));
  },
};

export const datesController = {
  async listInvites(req: AuthenticatedRequest, res: Response): Promise<void> {
    const invites = await listDateInvites(req.authUser!, req.accessToken!);
    res.json(successResponse(invites));
  },

  async joinByCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = joinByCodeBodySchema.parse(req.body);
    const result = await joinOnlineDateByCode(req.authUser!, req.accessToken!, body.accessCode);
    res.json(successResponse(result));
  },

  async createDate(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = createDateBodySchema.parse(req.body);
    const created = await createOnlineDate(req.authUser!, req.accessToken!, body);
    res.status(201).json(successResponse(created, 'Meetup created'));
  },

  async respondToInvite(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = respondInviteBodySchema.parse(req.body);
    const inviteId = String(req.params.id);
    const result = await respondToDateInvite(
      req.authUser!,
      req.accessToken!,
      inviteId,
      body.action,
    );
    res.json(successResponse(result));
  },
};
