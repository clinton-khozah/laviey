import type { Request, Response } from 'express';
import { listInterestOptions, listQuestions } from '../services/onboarding.service.js';
import { successResponse } from '../utils/apiResponse.js';

export const onboardingController = {
  async listQuestions(_req: Request, res: Response): Promise<void> {
    const questions = await listQuestions();
    res.json(successResponse(questions));
  },

  async listInterestOptions(_req: Request, res: Response): Promise<void> {
    const options = await listInterestOptions();
    res.json(successResponse(options));
  },
};
