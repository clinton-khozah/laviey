import type { Request, Response } from 'express';
import { z } from 'zod';
import type { AdminAuthenticatedRequest } from '../middleware/admin.middleware.js';
import {
  getAdminById,
  getRegistrationStatus,
  loginAdmin,
  registerAdmin,
} from '../services/admin-auth.service.js';
import { successResponse } from '../utils/apiResponse.js';

const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80),
  inviteCode: z.string().min(1).optional(),
});

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const adminAuthController = {
  /**
   * @openapi
   * /admin/auth/registration-status:
   *   get:
   *     tags: [Admin]
   *     summary: Whether admin registration requires an invite code
   *     responses:
   *       200:
   *         description: Registration gate status
   */
  async registrationStatus(_req: Request, res: Response): Promise<void> {
    const status = await getRegistrationStatus();
    res.json(successResponse(status));
  },

  /**
   * @openapi
   * /admin/auth/register:
   *   post:
   *     tags: [Admin]
   *     summary: Register admin account
   *     description: |
   *       First admin account does not require an invite code.
   *       Subsequent accounts require inviteCode matching ADMIN_REGISTER_SECRET.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password, displayName]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 minLength: 8
   *               displayName:
   *                 type: string
   *                 maxLength: 80
   *               inviteCode:
   *                 type: string
   *                 description: Required after the first admin exists
   *     responses:
   *       201:
   *         description: Admin registered and signed in
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/AdminAuthSession'
   *       403:
   *         description: Invalid or missing invite code
   *       409:
   *         description: Email already registered
   */
  async register(req: Request, res: Response): Promise<void> {
    const body = registerBodySchema.parse(req.body);
    const session = await registerAdmin({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      inviteCode: body.inviteCode,
    });
    res.status(201).json(successResponse(session));
  },

  /**
   * @openapi
   * /admin/auth/login:
   *   post:
   *     tags: [Admin]
   *     summary: Admin sign in
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Admin session (use token as Bearer for /admin/* routes)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/AdminAuthSession'
   *       401:
   *         description: Invalid email or password
   */
  async login(req: Request, res: Response): Promise<void> {
    const body = loginBodySchema.parse(req.body);
    const session = await loginAdmin(body.email, body.password);
    res.json(successResponse(session));
  },

  /**
   * @openapi
   * /admin/auth/me:
   *   get:
   *     tags: [Admin]
   *     summary: Get current admin
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Current admin profile
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     admin:
   *                       $ref: '#/components/schemas/AdminAccount'
   *       401:
   *         description: Invalid or expired admin session
   */
  async me(req: AdminAuthenticatedRequest, res: Response): Promise<void> {
    const adminId = req.admin?.id;
    if (!adminId) {
      res.json(successResponse(null));
      return;
    }
    const admin = await getAdminById(adminId);
    res.json(successResponse({ admin }));
  },
};
