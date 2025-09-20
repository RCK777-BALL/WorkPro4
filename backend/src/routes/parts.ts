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

const createPartSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  min: z.number().min(0).default(0),
  max: z.number().min(0).default(100),
  onHand: z.number().min(0).default(0),
  cost: z.number().min(0).default(0),
  vendorId: z.string().optional(),
});

const updatePartSchema = createPartSchema.partial();

const adjustPartSchema = z.object({
  delta: z.number(),
  reason: z.string(),
  woId: z.string().optional(),
});

// GET /parts
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const { belowMin } = req.query;

  const parts = await prisma.part.findMany({
    where: { tenantId },
    include: {
      vendor: {
        select: { id: true, name: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const filteredParts = belowMin === '1'
    ? parts.filter(part => part.onHand < part.min)
    : parts;

  return ok(res, filteredParts.map(part => ({
    ...part,
    cost: parseFloat(part.cost.toString()),
    createdAt: part.createdAt.toISOString(),
    updatedAt: part.updatedAt.toISOString(),
  })));
}));

// POST /parts
router.post('/', requireRoles(['planner', 'supervisor', 'admin']), asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const data = createPartSchema.parse(req.body);

  const part = await prisma.part.create({
    data: {
      ...data,
      tenantId,
    },
    include: {
      vendor: {
        select: { id: true, name: true },
      },
    },
  });

  await auditLog(tenantId, userId, 'create', 'part', part.id, null, part);

  return ok(res, {
    ...part,
    cost: parseFloat(part.cost.toString()),
    createdAt: part.createdAt.toISOString(),
    updatedAt: part.updatedAt.toISOString(),
  });
}));

// PUT /parts/:id
router.put('/:id', requireRoles(['planner', 'supervisor', 'admin']), asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { id } = req.params;
  const data = updatePartSchema.parse(req.body);

  const existing = await prisma.part.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return fail(res, 404, 'Part not found');
  }

  const part = await prisma.part.update({
    where: { id },
    data,
    include: {
      vendor: {
        select: { id: true, name: true },
      },
    },
  });

  await auditLog(tenantId, userId, 'update', 'part', id, existing, part);

  return ok(res, {
    ...part,
    cost: parseFloat(part.cost.toString()),
    createdAt: part.createdAt.toISOString(),
    updatedAt: part.updatedAt.toISOString(),
  });
}));

// POST /parts/:id/adjust
router.post('/:id/adjust', requireRoles(['tech', 'planner', 'supervisor', 'admin']), asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { id } = req.params;
  const { delta, reason, woId } = adjustPartSchema.parse(req.body);

  const existing = await prisma.part.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return fail(res, 404, 'Part not found');
  }

  const newOnHand = existing.onHand + delta;
  
  if (newOnHand < 0) {
    return fail(res, 400, 'Insufficient stock');
  }

  const part = await prisma.part.update({
    where: { id },
    data: {
      onHand: newOnHand,
    },
  });

  await auditLog(tenantId, userId, 'adjust_stock', 'part', id, 
    { onHand: existing.onHand, reason, woId }, 
    { onHand: newOnHand, delta, reason, woId }
  );

  return ok(res, {
    ...part,
    cost: parseFloat(part.cost.toString()),
    createdAt: part.createdAt.toISOString(),
    updatedAt: part.updatedAt.toISOString(),
  });
}));

export default router;