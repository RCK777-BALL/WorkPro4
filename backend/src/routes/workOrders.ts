import { Router } from 'express';
import { z } from 'zod';
import { Prisma, WorkOrderStatus } from '@prisma/client';
import { ok, fail, asyncHandler } from '../utils/response';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import {
  createWorkOrderValidator,
  objectIdSchema,
  priorityEnum,
  statusEnum,
} from '../validators/workOrderValidators';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(authenticateToken);


const updateWorkOrderSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(4000).optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  assetId: objectIdSchema.optional().nullable(),
  assigneeId: z.union([objectIdSchema, z.null()]).optional(),
  category: z.string().trim().max(120).optional().nullable(),
  dueDate: z
    .union([
      z.string().min(1),
      z.null(),
    ])
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined || value === null) {
        return;
      }

      const parsed = new Date(value);

      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'dueDate must be an ISO 8601 date string',
        });
      }
    }),
  attachments: z.array(objectIdSchema).optional(),
}).strict();


const workOrderInclude = {
  assignee: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

type WorkOrderWithRelations = Prisma.WorkOrderGetPayload<{ include: typeof workOrderInclude }>;

function serializeWorkOrder(workOrder: WorkOrderWithRelations) {
  return {
    id: workOrder.id,
    tenantId: workOrder.tenantId,
    title: workOrder.title,
    description: workOrder.description ?? null,
    priority: workOrder.priority,
    status: workOrder.status,
    assetId: workOrder.assetId ?? null,
    assigneeId: workOrder.assigneeId ?? null,
    assignee: workOrder.assignee
      ? {
          id: workOrder.assignee.id,
          name: workOrder.assignee.name,
          email: workOrder.assignee.email,
        }
      : null,
    category: workOrder.category ?? null,
    dueDate: workOrder.dueDate ? workOrder.dueDate.toISOString() : null,
    attachments: Array.isArray(workOrder.attachments) ? workOrder.attachments : [],
    createdBy: workOrder.createdBy,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  };
}

// GET /work-orders
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const workOrders = await prisma.workOrder.findMany({
    where: { tenantId: req.user!.tenantId },
    include: workOrderInclude,
    orderBy: { createdAt: 'desc' },
  });

  return ok(res, workOrders.map(serializeWorkOrder));
}));

// GET /work-orders/:id
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const workOrder = await prisma.workOrder.findFirst({
    where: { id, tenantId: req.user!.tenantId },
    include: workOrderInclude,
  });

  if (!workOrder) {
    return fail(res, 404, 'Work order not found');
  }

  return ok(res, serializeWorkOrder(workOrder));
}));

// POST /work-orders
router.post('/', auditLog('create', 'work_order'), asyncHandler(async (req: AuthRequest, res) => {
  const data = createWorkOrderValidator.parse(req.body);

  if (!req.user) {
    return fail(res, 401, 'Authentication required');
  }

  const workOrder = await prisma.workOrder.create({
    data: {
      title: data.title,
      description: data.description,
      status: (data.status ?? 'requested') as WorkOrderStatus,
      priority: data.priority ?? 'medium',
      assetId: data.assetId ?? undefined,
      assigneeId: data.assigneeId ?? null,
      category: data.category ?? undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      attachments: data.attachments ?? [],
      tenantId: req.user.tenantId,
      createdBy: req.user.id,


    },
    include: workOrderInclude,
  });

  res.locals.auditMetadata = {
    workOrderId: workOrder.id,
    status: workOrder.status,
  };

  return ok(res, serializeWorkOrder(workOrder));
}));

// PUT /work-orders/:id
router.put('/:id', auditLog('update', 'work_order'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = updateWorkOrderSchema.parse(req.body);

  const existing = await prisma.workOrder.findFirst({ where: { id, tenantId: req.user!.tenantId } });

  if (!existing) {
    return fail(res, 404, 'Work order not found');
  }

  const updateData: { [key: string]: unknown } = {};

  if (data.title !== undefined) {
    updateData.title = data.title;
  }

  if (data.description !== undefined) {
    updateData.description = data.description || null;
  }

  if (data.status !== undefined) {
    updateData.status = data.status as WorkOrderStatus;
  }

  if (data.priority !== undefined) {
    updateData.priority = data.priority;
  }

  if ('assetId' in data) {
    updateData.assetId = data.assetId ?? null;
  }

  if ('assigneeId' in data) {
    updateData.assigneeId = data.assigneeId ?? null;
  }

  if ('category' in data) {
    updateData.category = data.category && data.category.length > 0 ? data.category : null;
  }

  if ('dueDate' in data) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }

  if (data.attachments !== undefined) {
    updateData.attachments = data.attachments;

  }

  const workOrder = await prisma.workOrder.update({
    where: { id },
    data: updateData,
    include: workOrderInclude,
  });

  res.locals.auditMetadata = {
    workOrderId: workOrder.id,
    status: workOrder.status,
    fields: Object.keys(updateData),
  };

  return ok(res, serializeWorkOrder(workOrder));
}));

// DELETE /work-orders/:id
router.delete('/:id', auditLog('delete', 'work_order'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const existing = await prisma.workOrder.findFirst({ where: { id, tenantId: req.user!.tenantId } });

  if (!existing) {
    return fail(res, 404, 'Work order not found');
  }

  res.locals.auditMetadata = {
    workOrderId: id,
    previousStatus: existing.status,
  };

  await prisma.workOrder.delete({ where: { id } });

  return ok(res, { id });
}));

export default router;
