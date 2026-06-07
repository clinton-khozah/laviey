import { Router } from 'express';
import { supportController } from '../controllers/support.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const supportRoutes = Router();

supportRoutes.get('/config', requireAuth, (req, res, next) => {
  supportController.getConfig(req, res).catch(next);
});

supportRoutes.get('/conversation', requireAuth, (req, res, next) => {
  supportController.getConversation(req, res).catch(next);
});

supportRoutes.post('/messages', requireAuth, (req, res, next) => {
  supportController.sendMessage(req, res).catch(next);
});
