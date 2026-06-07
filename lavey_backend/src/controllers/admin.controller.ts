import type { Response } from 'express';
import { z } from 'zod';
import type { AdminAuthenticatedRequest } from '../middleware/admin.middleware.js';
import { listAdminUsers, getAdminUserById } from '../services/admin-users.service.js';
import {
  getSupportTicketForAdmin,
  listSupportTicketsForAdmin,
  replySupportTicketAsAdmin,
  updateSupportTicketStatus,
} from '../services/support.service.js';
import { successResponse } from '../utils/apiResponse.js';

const listUsersQuerySchema = z.object({
  view: z.enum(['all', 'subscribed', 'new', 'matches', 'top']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().optional(),
});

export const adminController = {
  /**
   * @openapi
   * /admin/users:
   *   get:
   *     tags: [Admin]
   *     summary: List members for admin user management
   *     description: |
   *       Paginated member directory for the admin dashboard.
   *       Requires admin JWT from POST /admin/auth/login (or legacy X-Lavey-Admin-Key header).
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: view
   *         schema:
   *           type: string
   *           enum: [all, subscribed, new, matches, top]
   *           default: all
   *         description: Segment filter (subscribed, new users, most matches, top users)
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 10
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Filter by display name or email (case-insensitive)
   *     responses:
   *       200:
   *         description: Member list with KPI summary and pagination
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/AdminUsersListResult'
   *       401:
   *         description: Missing or invalid admin credentials
   *       503:
   *         description: Admin data unavailable (service role not configured)
   */
  async listUsers(req: AdminAuthenticatedRequest, res: Response): Promise<void> {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await listAdminUsers(query);
    res.json(successResponse(result));
  },

  async getUser(req: AdminAuthenticatedRequest, res: Response): Promise<void> {
    const userId = z.string().uuid().parse(req.params.id);
    const user = await getAdminUserById(userId);
    res.json(successResponse(user));
  },

  async listSupportTickets(_req: AdminAuthenticatedRequest, res: Response): Promise<void> {
    const tickets = await listSupportTicketsForAdmin();
    res.json(successResponse(tickets));
  },

  async getSupportTicket(req: AdminAuthenticatedRequest, res: Response): Promise<void> {
    const ticketId = z.string().uuid().parse(req.params.id);
    const ticket = await getSupportTicketForAdmin(ticketId);
    res.json(successResponse(ticket));
  },

  async replySupportTicket(req: AdminAuthenticatedRequest, res: Response): Promise<void> {
    const ticketId = z.string().uuid().parse(req.params.id);
    const body = z.object({ body: z.string().min(1).max(4000) }).parse(req.body);
    const ticket = await replySupportTicketAsAdmin(
      ticketId,
      req.admin!.id,
      req.admin!.displayName,
      body.body,
    );
    res.json(successResponse(ticket));
  },

  async updateSupportTicket(req: AdminAuthenticatedRequest, res: Response): Promise<void> {
    const ticketId = z.string().uuid().parse(req.params.id);
    const body = z.object({ status: z.enum(['open', 'pending', 'resolved']) }).parse(req.body);
    await updateSupportTicketStatus(ticketId, body.status);
    res.json(successResponse({ ok: true }));
  },
};
