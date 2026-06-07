import type { Request, Response } from 'express';
import { getLegalDocument } from '../services/legal.service.js';
import { successResponse } from '../utils/apiResponse.js';

export const legalController = {
  async getTerms(_req: Request, res: Response): Promise<void> {
    const document = await getLegalDocument('terms');
    res.json(successResponse(document));
  },

  async getGuidelines(_req: Request, res: Response): Promise<void> {
    const document = await getLegalDocument('guidelines');
    res.json(successResponse(document));
  },
};
