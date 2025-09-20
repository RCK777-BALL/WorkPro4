import { Router } from 'express';
import { z } from 'zod';
import { ok, fail, asyncHandler } from '../utils/response';
import { authenticateToken, AuthRequest, requireRoles } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { auditLog } from '../middleware/audit';
import { prisma } from '../db';

const router = Router();

router.use(authenticateToken);
router.use(tenantScope);

const createWorkOrderSchema = z.object({
  assetId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignees: z.array(z.string()).default([]),
  lineName: z.string().min(1).optional(),
  stationNumber: z.string().min(1).optional(),
  checklists: z.array(z.object({
    text: z.string(),
    note: z.string().optional(),
  })).default([]),
});

const updateWorkOrderSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignees: z.array(z.string()).optional(),
  lineName: z.string().min(1).optional(),
  stationNumber: z.string().min(1).optional(),
  checklists: z.array(z.object({
    text: z.string(),
    done: z.boolean(),
    note: z.string().optional(),
    completedAt: z.string().optional(),
  })).optional(),
});

const completeWorkOrderSchema = z.object({
  timeSpentMin: z.number().optional(),
  checklists: z.array(z.object({
    text: z.string(),
    done: z.boolean(),
    note: z.string().optional(),
    completedAt: z.string().optional(),
  })).optional(),
  partsUsed: z.array(z.object({
    partId: z.string(),
    qty: z.number(),
    cost: z.number().optional(),
  })).optional(),
  signatures: z.array(z.object({
    byUserId: z.string(),
    byName: z.string().optional(),
    role: z.string().optional(),
  })).optional(),
  photos: z.array(z.string()).optional(),
  failureCode: z.string().optional(),
});

// GET /work-orders
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const { status, priority, assignee, from, to } = req.query;

  const where: any = { tenantId };
  
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignee) where.assignees = { has: assignee };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from as string);
    if (to) where.createdAt.lte = new Date(to as string);
  }

  const workOrders = await prisma.workOrder.findMany({
    where,
    include: {
      asset: {
        select: { id: true, code: true, name: true },
      },
      createdByUser: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok(res, workOrders.map(wo => ({
    ...wo,
    createdAt: wo.createdAt.toISOString(),
    updatedAt: wo.updatedAt.toISOString(),
  })));
}));

// GET /work-orders/:id
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const workOrder = await prisma.workOrder.findFirst({
    where: { id, tenantId },
    include: {
      asset: {
        select: { id: true, code: true, name: true },
      },
      createdByUser: {
        select: { id: true, name: true },
      },
    },
  });

  if (!workOrder) {
    return fail(res, 404, 'Work order not found');
  }

  return ok(res, {
    ...workOrder,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  });
}));

// POST /work-orders
router.post('/', requireRoles(['planner', 'supervisor', 'admin']), asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const data = createWorkOrderSchema.parse(req.body);

  const workOrder = await prisma.workOrder.create({
    data: {
      ...data,
      tenantId,
      createdBy: userId,
      checklists: data.checklists.map(item => ({
        ...item,
        done: false,
      })),
    },
    include: {
      asset: {
        select: { id: true, code: true, name: true },
      },
      createdByUser: {
        select: { id: true, name: true },
      },
    },
  });

  await auditLog(tenantId, userId, 'create', 'work_order', workOrder.id, null, workOrder);

  return ok(res, {
    ...workOrder,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  });
}));

// PUT /work-orders/:id
router.put('/:id', requireRoles(['planner', 'supervisor', 'admin']), asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { id } = req.params;
  const data = updateWorkOrderSchema.parse(req.body);

  const existing = await prisma.workOrder.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return fail(res, 404, 'Work order not found');
  }

  const workOrder = await prisma.workOrder.update({
    where: { id },
    data,
    include: {
      asset: {
        select: { id: true, code: true, name: true },
      },
      createdByUser: {
        select: { id: true, name: true },
      },
    },
  });

  await auditLog(tenantId, userId, 'update', 'work_order', id, existing, workOrder);

  return ok(res, {
    ...workOrder,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  });
}));

// POST /work-orders/:id/assign
router.post('/:id/assign', requireRoles(['planner', 'supervisor', 'admin']), asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { id } = req.params;
  const { assignees } = z.object({ assignees: z.array(z.string()) }).parse(req.body);

  const existing = await prisma.workOrder.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return fail(res, 404, 'Work order not found');
  }

  const workOrder = await prisma.workOrder.update({
    where: { id },
    data: {
      assignees,
      status: 'assigned',
    },
  });

  await auditLog(tenantId, userId, 'assign', 'work_order', id, existing, workOrder);

  return ok(res, {
    ...workOrder,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  });
}));

// POST /work-orders/:id/start
router.post('/:id/start', requireRoles(['tech', 'planner', 'supervisor', 'admin']), asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = await prisma.workOrder.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return fail(res, 404, 'Work order not found');
  }

  if (existing.status !== 'assigned' && existing.status !== 'requested') {
    return fail(res, 400, 'Work order cannot be started from current status');
  }

  const workOrder = await prisma.workOrder.update({
    where: { id },
    data: {
      status: 'in_progress',
    },
  });

  await auditLog(tenantId, userId, 'start', 'work_order', id, existing, workOrder);

  return ok(res, {
    ...workOrder,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  });
}));

// POST /work-orders/:id/complete
router.post('/:id/complete', requireRoles(['tech', 'planner', 'supervisor', 'admin']), asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { id } = req.params;
  const data = completeWorkOrderSchema.parse(req.body);

  const existing = await prisma.workOrder.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return fail(res, 404, 'Work order not found');
  }

  if (existing.status !== 'in_progress') {
    return fail(res, 400, 'Work order must be in progress to complete');
  }

  // Add timestamps to signatures
  const signatures = data.signatures?.map(sig => ({
    ...sig,
    ts: new Date().toISOString(),
  }));

  const workOrder = await prisma.workOrder.update({
    where: { id },
    data: {
      status: 'completed',
      timeSpentMin: data.timeSpentMin,
      checklists: data.checklists,
      partsUsed: data.partsUsed,
      signatures,
      photos: data.photos,
      failureCode: data.failureCode,
    },
  });

  await auditLog(tenantId, userId, 'complete', 'work_order', id, existing, workOrder);

  return ok(res, {
    ...workOrder,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  });
}));

// POST /work-orders/:id/cancel
router.post('/:id/cancel', requireRoles(['planner', 'supervisor', 'admin']), asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = await prisma.workOrder.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return fail(res, 404, 'Work order not found');
  }

  if (existing.status === 'completed' || existing.status === 'cancelled') {
    return fail(res, 400, 'Work order cannot be cancelled from current status');
  }

  const workOrder = await prisma.workOrder.update({
    where: { id },
    data: {
      status: 'cancelled',
    },
  });

  await auditLog(tenantId, userId, 'cancel', 'work_order', id, existing, workOrder);

  return ok(res, {
    ...workOrder,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  });
}));

export default router;