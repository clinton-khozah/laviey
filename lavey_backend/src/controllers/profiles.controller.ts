import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { getDiscoverFeed, getDiscoverProfileById } from '../services/discover.service.js';
import { successResponse } from '../utils/apiResponse.js';

function readQueryString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

export const profilesController = {
  async getDiscoverFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
    const filter = readQueryString(req.query.filter);
    const cursor = readQueryString(req.query.cursor);
    const limitText = readQueryString(req.query.limit);
    const limit = limitText ? Number(limitText) : undefined;
    const distanceTierKm = readQueryString(req.query.distanceTierKm);
    const expandDistance = readQueryString(req.query.expandDistance);
    const maxDistanceKmText = readQueryString(req.query.maxDistanceKm);
    const ageMinText = readQueryString(req.query.ageMin);
    const ageMaxText = readQueryString(req.query.ageMax);

    const feed = await getDiscoverFeed(req.authUser!, req.accessToken!, {
      filter,
      cursor,
      limit,
      distanceTierKm,
      expandDistance,
      maxDistanceKm: maxDistanceKmText ? Number(maxDistanceKmText) : undefined,
      ageMin: ageMinText ? Number(ageMinText) : undefined,
      ageMax: ageMaxText ? Number(ageMaxText) : undefined,
    });
    res.json(successResponse(feed));
  },

  async getProfileById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const profile = await getDiscoverProfileById(String(req.params.id), req.accessToken!);
    res.json(successResponse(profile));
  },
};
