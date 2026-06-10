import { Router } from 'express';
import { datesController } from '../controllers/rooms.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const datesRoutes = Router();

datesRoutes.get('/invites', requireAuth, (req, res, next) => {
  datesController.listInvites(req, res).catch(next);
});

datesRoutes.post('/join-by-code', requireAuth, (req, res, next) => {
  datesController.joinByCode(req, res).catch(next);
});

datesRoutes.post('/', requireAuth, (req, res, next) => {
  datesController.createDate(req, res).catch(next);
});

datesRoutes.post('/invites/:id', requireAuth, (req, res, next) => {
  datesController.respondToInvite(req, res).catch(next);
});
