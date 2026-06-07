import type { Request, Response } from 'express';
import { z } from 'zod';
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
  inviteToName: z.string().max(80).optional(),
  startsInMinutes: z.number().int().min(0).max(10080),
});

const respondInviteBodySchema = z.object({
  action: z.enum(['accept', 'decline']),
});

export const roomsController = {
  listVibeCheck(_req: Request, res: Response): void {
    res.json(successResponse(listOnlineDates()));
  },

  joinVibeCheck(req: Request, res: Response): void {
    const body = joinBodySchema.parse(req.body);
    const dateId = String(req.params.id);
    const result = joinOnlineDate(dateId, body.accessCode);
    res.json(successResponse(result));
  },
};

export const datesController = {
  listInvites(_req: Request, res: Response): void {
    res.json(successResponse(listDateInvites()));
  },

  joinByCode(req: Request, res: Response): void {
    const body = joinByCodeBodySchema.parse(req.body);
    const result = joinOnlineDateByCode(body.accessCode);
    res.json(successResponse(result));
  },

  createDate(req: Request, res: Response): void {
    const body = createDateBodySchema.parse(req.body);
    const created = createOnlineDate(body);
    res.status(201).json(successResponse(created, 'Meetup created'));
  },

  respondToInvite(req: Request, res: Response): void {
    const body = respondInviteBodySchema.parse(req.body);
    const inviteId = String(req.params.id);
    const invite = respondToDateInvite(inviteId, body.action);
    res.json(successResponse(invite));
  },
};
