import { Router } from 'express';
import { z } from 'zod';
import { ok, fail, asyncHandler } from '../utils/response';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { Prisma, WorkOrderStatus } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

const statusEnum = z.enum(['requested', 'assigned', 'in_progress', 'completed', 'cancelled']);

const createWorkOrderSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: statusEnum.optional(),
  assigneeId: z.string().optional(),
});

const updateWorkOrderSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: statusEnum.optional(),
  assigneeId: z.string().nullable().optional(),
});

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
    ...workOrder,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  };
}

// GET /work-orders
router.get('/', asyncHandler(async (_req: AuthRequest, res) => {
  const workOrders = await prisma.workOrder.findMany({
    include: workOrderInclude,
    orderBy: { createdAt: 'desc' },
  });

  return ok(res, workOrders.map(serializeWorkOrder));
}));

// GET /work-orders/:id
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: workOrderInclude,
  });

  if (!workOrder) {
    return fail(res, 404, 'Work order not found');
  }

  return ok(res, serializeWorkOrder(workOrder));
}));

// POST /work-orders
router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const data = createWorkOrderSchema.parse(req.body);

  if (!req.user) {
    return fail(res, 401, 'Authentication required');
  }

  const workOrder = await prisma.workOrder.create({
    data: {
      title: data.title,
      description: data.description,
      status: (data.status ?? 'requested') as WorkOrderStatus,
      assigneeId: data.assigneeId,
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      assignees: data.assigneeId ? [data.assigneeId] : [],
    },
    include: workOrderInclude,
  });

  return ok(res, serializeWorkOrder(workOrder));
}));

// PUT /work-orders/:id
router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = updateWorkOrderSchema.parse(req.body);

  const existing = await prisma.workOrder.findUnique({ where: { id } });

  if (!existing) {
    return fail(res, 404, 'Work order not found');
  }

  const updateData: { [key: string]: unknown } = {
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.status !== undefined ? { status: data.status as WorkOrderStatus } : {}),
  };

  if ('assigneeId' in data) {
    updateData.assigneeId = data.assigneeId ?? null;
  }

  const workOrder = await prisma.workOrder.update({
    where: { id },
    data: updateData,
    include: workOrderInclude,
  });

  return ok(res, serializeWorkOrder(workOrder));
}));

// DELETE /work-orders/:id
router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const existing = await prisma.workOrder.findUnique({ where: { id } });

  if (!existing) {
    return fail(res, 404, 'Work order not found');
  }

  await prisma.workOrder.delete({ where: { id } });

  return ok(res, { id });
}));

export default router;
