import { Router } from 'express';
import { legalController } from '../controllers/legal.controller.js';

export const legalRoutes = Router();

legalRoutes.get('/terms', (req, res, next) => {
  legalController.getTerms(req, res).catch(next);
});

legalRoutes.get('/guidelines', (req, res, next) => {
  legalController.getGuidelines(req, res).catch(next);
});
