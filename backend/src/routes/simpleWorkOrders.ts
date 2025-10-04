import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { createWorkOrderValidator } from '../validators/workOrderValidators';
import { asyncHandler, fail, ok } from '../utils/response';
import { emitTenantWebhookEvent } from '../lib/webhookDispatcher';

const router = Router();

const workOrderCreateSchema = createWorkOrderValidator;

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

async function resolveDefaultUser() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!user) {
    return null;
  }

  return user;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const defaultUser = await resolveDefaultUser();

    if (!defaultUser) {
      return fail(res, 500, 'No default user found');
    }

    const { status, priority, assignee, from, to, q, category } = req.query;

    const where: Prisma.WorkOrderWhereInput = {};

    where.tenantId = defaultUser.tenantId;

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
  asyncHandler(async (req, res) => {
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

    const defaultUser = await resolveDefaultUser();
    if (!defaultUser) {
      return fail(res, 500, 'No default user found to assign work orders');
    }

    const workOrder = await prisma.workOrder.create({
      data: {
        title: payload.title,
        description: payload.description,
        priority: payload.priority ?? 'medium',
        status: payload.status ?? 'requested',
        tenantId: defaultUser.tenantId,
        createdBy: defaultUser.id,
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

    void emitTenantWebhookEvent(defaultUser.tenantId, 'work-order.created', {
      workOrder: normalized,
    });

    return ok(res, normalized);
  }),
);

export default router;

