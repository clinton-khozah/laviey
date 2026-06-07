import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { onboardingRoutes } from './onboarding.routes.js';
import { metaRoutes } from './meta.routes.js';
import { datesRoutes } from './dates.routes.js';
import { messagesRoutes } from './messages.routes.js';
import { matchesRoutes } from './matches.routes.js';
import { profilesRoutes } from './profiles.routes.js';
import { roomsRoutes } from './rooms.routes.js';
import { subscriptionRoutes } from './subscription.routes.js';
import { supportRoutes } from './support.routes.js';
import { legalRoutes } from './legal.routes.js';
import { giftsRoutes } from './gifts.routes.js';
import { postsRoutes } from './posts.routes.js';
import { usersRoutes } from './users.routes.js';
import { adminRoutes } from './admin.routes.js';
import { successResponse } from '../utils/apiResponse.js';

export const apiRoutes = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: API is running
 */
apiRoutes.get('/health', (_req, res) => {
  res.json(successResponse({ status: 'ok' }));
});

apiRoutes.use('/onboarding', onboardingRoutes);
apiRoutes.use('/meta', metaRoutes);
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/profiles', profilesRoutes);
apiRoutes.use('/users', usersRoutes);
apiRoutes.use('/posts', postsRoutes);
apiRoutes.use('/subscription', subscriptionRoutes);
apiRoutes.use('/support', supportRoutes);
apiRoutes.use('/legal', legalRoutes);
apiRoutes.use('/gifts', giftsRoutes);
apiRoutes.use('/messages', messagesRoutes);
apiRoutes.use('/matches', matchesRoutes);
apiRoutes.use('/rooms', roomsRoutes);
apiRoutes.use('/dates', datesRoutes);
apiRoutes.use('/admin', adminRoutes);
