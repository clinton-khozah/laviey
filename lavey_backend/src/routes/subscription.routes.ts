import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller.js';

export const subscriptionRoutes = Router();

subscriptionRoutes.get('/flame-quota', subscriptionController.getFlameQuota);
subscriptionRoutes.get('/platinum', (req, res, next) => {
  void subscriptionController.getPlatinumCatalog(req, res).catch(next);
});
