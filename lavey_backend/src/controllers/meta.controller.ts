import type { Request, Response } from 'express';
import { getRegisteredRoutes } from '../services/routeRegistry.service.js';
import { successResponse } from '../utils/apiResponse.js';

export const metaController = {
  listRoutes(_req: Request, res: Response): void {
    res.json(successResponse(getRegisteredRoutes()));
  },
};
