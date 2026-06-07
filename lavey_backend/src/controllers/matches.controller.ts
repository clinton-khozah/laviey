import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { listMatches, sendFlame } from '../services/match.service.js';
import { successResponse } from '../utils/apiResponse.js';

const flameBodySchema = z.object({
  profileId: z.string().uuid(),
});

const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const matchesController = {
  async sendFlame(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = flameBodySchema.parse(req.body);
    const result = await sendFlame(req.authUser!, req.accessToken!, body.profileId);
    res.json(successResponse(result));
  },

  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const query = listMatchesQuerySchema.parse(req.query);
    const result = await listMatches(req.authUser!, req.accessToken!, query.limit);
    res.json(successResponse(result));
  },
};
