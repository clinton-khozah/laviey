import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  getGiftWallet,
  getPayoutCatalog,
  requestGiftWithdrawal,
  savePayoutAccount,
} from '../services/payout.service.js';
import { successResponse } from '../utils/apiResponse.js';

const savePayoutAccountSchema = z.object({
  methodId: z.string().min(1),
  bankId: z.string().min(1),
  accountHolder: z.string().min(1).max(120),
  accountNumber: z.string().min(4).max(32),
  accountType: z.enum(['checking', 'savings']).optional(),
});

const withdrawSchema = z.object({
  amountUsd: z.number().positive().max(1_000_000),
});

export const payoutController = {
  async getCatalog(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const catalog = await getPayoutCatalog();
    res.json(successResponse(catalog));
  },

  async getWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
    const wallet = await getGiftWallet(req.authUser!, req.accessToken!);
    res.json(successResponse(wallet));
  },

  async saveAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = savePayoutAccountSchema.parse(req.body);
    const account = await savePayoutAccount(req.authUser!, req.accessToken!, body);
    res.json(successResponse(account));
  },

  async withdraw(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = withdrawSchema.parse(req.body);
    const result = await requestGiftWithdrawal(req.authUser!, req.accessToken!, body.amountUsd);
    res.json(successResponse(result));
  },
};
