import type { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import {
  mapSession,
  signInWithEmail,
  signInWithGoogleIdToken,
  signOutAccessToken,
  signUpWithEmail,
  verifyEmailWithCode,
  resendEmailVerification,
  changeUserPassword,
} from '../services/auth.service.js';
import { createSupabaseServerClient } from '../lib/supabase.server.js';
import { successResponse } from '../utils/apiResponse.js';
import { AppError } from '../utils/appError.js';
import {
  clearOAuthFrontendOrigin,
  pickFrontendOrigin,
  readOAuthFrontendOrigin,
  stashOAuthFrontendOrigin,
} from '../utils/oauthFrontendOrigin.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';

const googleTokenBodySchema = z.object({
  idToken: z.string().min(1),
});

const emailSignInBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const emailSignUpBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(80),
});

const verifyEmailBodySchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(8),
});

const resendVerificationBodySchema = z.object({
  email: z.string().email(),
});

const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6).max(128),
});

export const authController = {
  /**
   * @openapi
   * /auth/google:
   *   get:
   *     tags: [Auth]
   *     summary: Start Google OAuth sign-in
   *     description: Redirects through Supabase to Google's consent screen.
   *     responses:
   *       302:
   *         description: Redirect to Google OAuth
   */
  async startGoogleOAuth(req: Request, res: Response): Promise<void> {
    const frontendOrigin = pickFrontendOrigin(
      typeof req.query.origin === 'string' ? req.query.origin : undefined,
    );
    stashOAuthFrontendOrigin(res, frontendOrigin);

    const supabase = createSupabaseServerClient(req, res);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: env.GOOGLE_REDIRECT_URI,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      throw new AppError(
        500,
        'OAUTH_START_FAILED',
        error?.message ?? 'Could not start Google sign-in',
      );
    }

    res.redirect(data.url);
  },

  /**
   * @openapi
   * /auth/google/callback:
   *   get:
   *     tags: [Auth]
   *     summary: Google OAuth callback
   *     description: Supabase returns here after Google sign-in; exchanges the code for a session.
   *     parameters:
   *       - in: query
   *         name: code
   *         schema:
   *           type: string
   *     responses:
   *       302:
   *         description: Redirect to frontend with access token
   */
  async googleOAuthCallback(req: Request, res: Response): Promise<void> {
    const { code, error: oauthError, error_description: oauthErrorDescription } = req.query;

    const frontendOrigin = readOAuthFrontendOrigin(req);
    const callbackUrl = new URL('/auth/callback', frontendOrigin);

    const redirectToFrontend = (params?: Record<string, string>) => {
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          callbackUrl.searchParams.set(key, value);
        }
      }
      clearOAuthFrontendOrigin(res);
      res.redirect(callbackUrl.toString());
    };

    if (typeof oauthError === 'string') {
      const message =
        typeof oauthErrorDescription === 'string' ? oauthErrorDescription : oauthError;
      redirectToFrontend({ error: message });
      return;
    }

    if (!code || typeof code !== 'string') {
      redirectToFrontend({ error: 'missing_code' });
      return;
    }

    try {
      const supabase = createSupabaseServerClient(req, res);
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.session) {
        throw new AppError(
          401,
          'GOOGLE_SIGN_IN_FAILED',
          error?.message ?? 'Could not create session',
        );
      }

      const session = mapSession(data.session);
      redirectToFrontend({ token: session.token });
    } catch (err) {
      console.error('Google OAuth callback failed:', err);
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      redirectToFrontend({ error: message });
    }
  },

  /**
   * @openapi
   * /auth/google:
   *   post:
   *     tags: [Auth]
   *     summary: Sign in with Google ID token
   *     description: Accepts a Google ID token from the client and returns a Lavey session.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [idToken]
   *             properties:
   *               idToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Authenticated session
   */
  async signInWithGoogleToken(req: Request, res: Response): Promise<void> {
    const { idToken } = googleTokenBodySchema.parse(req.body);
    const session = await signInWithGoogleIdToken(idToken);
    res.json(successResponse(session, 'Signed in with Google'));
  },

  async loginWithEmail(req: Request, res: Response): Promise<void> {
    const body = emailSignInBodySchema.parse(req.body);
    const session = await signInWithEmail(body.email, body.password);
    res.json(successResponse(session, 'Signed in'));
  },

  async registerWithEmail(req: Request, res: Response): Promise<void> {
    const body = emailSignUpBodySchema.parse(req.body);
    const result = await signUpWithEmail(body.email, body.password, body.displayName);
    const message = result.needsEmailVerification
      ? 'Verification code sent to your email'
      : 'Account created';
    res.json(successResponse(result, message));
  },

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const body = verifyEmailBodySchema.parse(req.body);
    const session = await verifyEmailWithCode(body.email, body.code);
    res.json(successResponse(session, 'Email verified'));
  },

  async resendVerification(req: Request, res: Response): Promise<void> {
    const body = resendVerificationBodySchema.parse(req.body);
    await resendEmailVerification(body.email);
    res.json(successResponse({ sent: true }, 'Verification code sent'));
  },

  /**
   * @openapi
   * /auth/me:
   *   get:
   *     tags: [Auth]
   *     summary: Get current user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Current authenticated user
   *       401:
   *         description: Unauthorized
   */
  async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.json(successResponse(req.authUser));
  },

  /**
   * @openapi
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Sign out
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       204:
   *         description: Signed out
   */
  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (req.accessToken) {
      await signOutAccessToken(req.accessToken);
    }
    res.status(204).send();
  },

  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = changePasswordBodySchema.parse(req.body);
    await changeUserPassword(
      req.authUser!,
      req.accessToken!,
      body.currentPassword,
      body.newPassword,
    );
    res.json(successResponse({ ok: true }, 'Password updated'));
  },
};
