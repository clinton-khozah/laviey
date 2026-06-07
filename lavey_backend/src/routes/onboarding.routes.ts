import { Router } from 'express';
import { onboardingController } from '../controllers/onboarding.controller.js';

export const onboardingRoutes = Router();

onboardingRoutes.get('/questions', (req, res, next) => {
  onboardingController.listQuestions(req, res).catch(next);
});

onboardingRoutes.get('/interests', (req, res, next) => {
  onboardingController.listInterestOptions(req, res).catch(next);
});
