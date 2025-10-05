import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { createWorkOrderValidator } from '../validators/workOrderValidators';
import { asyncHandler, fail, ok } from '../utils/response';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { emitTenantWebhookEvent } from '../lib/webhookDispatcher';

const router = Router();

router.use(authenticateToken);

const workOrderCreateSchema = createWorkOrderValidator;

router.use(authenticateToken);

type WorkOrderWithRelations = Prisma.WorkOrderGetPayload<{
  include: {
    asset: { select: { id: true; code: true; name: true } };
    createdByUser: { select: { id: true; name: true } };
    assignee: { select: { id: true; name: true } };
  };
}>;

function mapWorkOrder(workOrder: WorkOrderWithRelations) {
  return {
    id: workOrder.id,
    title: workOrder.title,
    description: workOrder.description ?? '',
    status: workOrder.status,
    priority: workOrder.priority,
    assetId: workOrder.assetId ?? null,
    assetName: workOrder.asset?.name ?? null,
    assetCode: workOrder.asset?.code ?? null,
    assigneeId: workOrder.assigneeId ?? null,
    assigneeName: workOrder.assignee?.name ?? null,
    category: workOrder.category ?? null,
    attachments: Array.isArray(workOrder.attachments) ? workOrder.attachments : [],
    requestedById: workOrder.createdByUser?.id ?? null,
    requestedByName: workOrder.createdByUser?.name ?? 'System',
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
    completedAt: workOrder.status === 'completed' ? workOrder.updatedAt.toISOString() : null,
    dueDate: workOrder.dueDate ? workOrder.dueDate.toISOString() : null,
    actualHours: workOrder.timeSpentMin ? workOrder.timeSpentMin / 60 : null,
  };
}

const VIEW_WORK_ORDER_ROLES = ['admin', 'manager', 'technician', 'viewer', 'user'] as const;
const CREATE_WORK_ORDER_ROLES = ['admin', 'manager', 'technician', 'user'] as const;

function normalizeRole(role: string | undefined | null) {
  return typeof role === 'string' && role.trim().length > 0 ? role.trim().toLowerCase() : 'user';
}

function hasRequiredRole(user: NonNullable<AuthRequest['user']>, roles: readonly string[]) {
  const normalizedRole = normalizeRole(user.role);
  return roles.includes(normalizedRole);
}

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    if (!hasRequiredRole(req.user, VIEW_WORK_ORDER_ROLES)) {
      return fail(
        res,
        403,
        `Requires one of the following roles: ${VIEW_WORK_ORDER_ROLES.join(', ')}`,
      );
    }

    const { status, priority, assignee, from, to, q, category } = req.query;

    const where: Prisma.WorkOrderWhereInput = {};

    where.tenantId = req.user.tenantId;

    if (typeof status === 'string' && status) {
      const allowedStatuses = ['requested', 'assigned', 'in_progress', 'completed', 'cancelled'] as const;
      if ((allowedStatuses as readonly string[]).includes(status)) {
        where.status = status as (typeof allowedStatuses)[number];
      }
    }

    if (typeof priority === 'string' && priority) {
      const allowedPriorities = ['low', 'medium', 'high', 'urgent'] as const;
      if ((allowedPriorities as readonly string[]).includes(priority)) {
        where.priority = priority as (typeof allowedPriorities)[number];
      }
    }

    if (typeof assignee === 'string' && assignee) {
      where.assigneeId = assignee;
    }

    if (typeof category === 'string' && category.trim().length > 0) {
      where.category = category.trim();
    }

    const createdAt: { gte?: Date; lte?: Date } = {};

    if (typeof from === 'string' && from) {
      const parsed = new Date(from);
      if (!Number.isNaN(parsed.getTime())) {
        createdAt.gte = parsed;
      }
    }

    if (typeof to === 'string' && to) {
      const parsed = new Date(to);
      if (!Number.isNaN(parsed.getTime())) {
        createdAt.lte = parsed;
      }
    }

    if (createdAt.gte || createdAt.lte) {
      where.createdAt = createdAt;
    }

    if (typeof q === 'string' && q.trim().length > 0) {
      const search = q.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { assetId: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        asset: { select: { id: true, code: true, name: true } },
        createdByUser: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ok(res, workOrders.map(mapWorkOrder));
  }),
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    if (!hasRequiredRole(req.user, CREATE_WORK_ORDER_ROLES)) {
      return fail(
        res,
        403,
        `Requires one of the following roles: ${CREATE_WORK_ORDER_ROLES.join(', ')}`,
      );
    }

    const parseResult = workOrderCreateSchema.safeParse(req.body);

    if (!parseResult.success) {
      const { fieldErrors } = parseResult.error.flatten();
      const assetIdError = fieldErrors.assetId?.[0];
      if (assetIdError) {
        return fail(res, 400, assetIdError);
      }

      return fail(res, 400, 'Invalid request body');
    }

    const payload = parseResult.data;

    const workOrder = await prisma.workOrder.create({
      data: {
        title: payload.title,
        description: payload.description,
        priority: payload.priority ?? 'medium',
        status: payload.status ?? 'requested',
        tenantId: req.user.tenantId,
        createdBy: req.user.id,
        assetId: payload.assetId ?? undefined,
        assigneeId: payload.assigneeId ?? null,
        category: payload.category ?? undefined,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
        attachments: payload.attachments ?? [],
      },
      include: {
        asset: { select: { id: true, code: true, name: true } },
        createdByUser: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    const normalized = mapWorkOrder(workOrder);

    void emitTenantWebhookEvent(req.user.tenantId, 'work-order.created', {
      workOrder: normalized,
    });

    return ok(res, normalized);
  }),
);

export default router;

