import { Router } from 'express';
import { matchesController } from '../controllers/matches.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const matchesRoutes = Router();

matchesRoutes.post('/flame', requireAuth, (req, res, next) => {
  matchesController.sendFlame(req, res).catch(next);
});

matchesRoutes.get('/', requireAuth, (req, res, next) => {
  matchesController.list(req, res).catch(next);
});
