import { Router } from 'express';
import { payoutController } from '../controllers/payout.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const giftsRoutes = Router();

giftsRoutes.get('/payout-catalog', (req, res, next) => {
  payoutController.getCatalog(req, res).catch(next);
});

giftsRoutes.get('/wallet', requireAuth, (req, res, next) => {
  payoutController.getWallet(req, res).catch(next);
});

giftsRoutes.put('/payout-account', requireAuth, (req, res, next) => {
  payoutController.saveAccount(req, res).catch(next);
});

giftsRoutes.post('/withdraw', requireAuth, (req, res, next) => {
  payoutController.withdraw(req, res).catch(next);
});
