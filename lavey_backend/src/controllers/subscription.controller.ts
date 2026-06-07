import type { Request, Response } from 'express';
import { getPlatinumCatalog } from '../services/platinum.service.js';
import { successResponse } from '../utils/apiResponse.js';

export const subscriptionController = {
  getFlameQuota(_req: Request, res: Response): void {
    res.json(successResponse({ remaining: 3, max: 5 }));
  },

  async getPlatinumCatalog(_req: Request, res: Response): Promise<void> {
    const catalog = await getPlatinumCatalog();
    res.json(successResponse(catalog));
  },
};
