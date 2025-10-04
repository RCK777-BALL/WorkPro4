import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { authenticateToken, AuthRequest, requireRoles } from '../middleware/auth';
import { asyncHandler, fail, ok } from '../utils/response';

const router = Router();

router.use(authenticateToken);
router.use(requireRoles(['admin']));

router.get(
  '/export',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const { from, to, action, resource } = req.query;
    const where: Prisma.AuditEventWhereInput = {
      tenantId: req.user.tenantId,
    };

    if (typeof action === 'string' && action.trim()) {
      where.action = action.trim();
    }

    if (typeof resource === 'string' && resource.trim()) {
      where.resource = resource.trim();
    }

    if ((typeof from === 'string' && from.trim()) || (typeof to === 'string' && to.trim())) {
      where.occurredAt = {};

      if (typeof from === 'string' && from.trim()) {
        const parsed = new Date(from);
        if (!Number.isNaN(parsed.getTime())) {
          where.occurredAt.gte = parsed;
        }
      }

      if (typeof to === 'string' && to.trim()) {
        const parsed = new Date(to);
        if (!Number.isNaN(parsed.getTime())) {
          where.occurredAt.lte = parsed;
        }
      }
    }

    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: 1000,
    });

    return ok(res, {
      events: events.map((event) => ({
        id: event.id,
        action: event.action,
        resource: event.resource,
        timestamp: event.occurredAt.toISOString(),
        userId: event.userId,
        userRole: event.userRole,
        context: event.context,
      })),
      total: events.length,
    });
  }),
);

export default router;
