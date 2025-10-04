import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { asyncHandler, fail, ok } from '../utils/response';
import { prisma } from '../db';
import { resolveTenantId } from '../lib/tenantContext';
import { normalizeObjectId } from '../lib/normalizeObjectId';
import { emitTenantWebhookEvent } from '../lib/webhookDispatcher';

const router = Router();

router.use(authenticateToken);

const createPartSchema = z.object({
  name: z.string().min(1).max(120),
  sku: z.string().min(1).max(80).optional(),
  onHand: z.number().int().min(0).default(0),
  minLevel: z.number().int().min(0).default(0),
  cost: z.number().nonnegative().optional(),
  vendor: z.string().max(120).optional(),
});

const updateQuantitySchema = z.object({
  onHand: z.number().int().min(0),
  minLevel: z.number().int().min(0).optional(),
});

function mapPart(record: Prisma.PartGetPayload<unknown>) {
  return {
    id: record.id,
    name: record.name,
    sku: record.sku ?? null,
    onHand: record.onHand,
    minLevel: record.minLevel,
    cost: record.cost ?? null,
    vendor: record.vendor ?? null,
    tenantId: record.tenantId,
    updatedAt: record.updatedAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
  };
}

async function resolveTenant(req: AuthRequest): Promise<string> {
  return resolveTenantId(req.user?.tenantId ?? null);
}

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = await resolveTenant(req);

    const parts = await prisma.part.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    return ok(res, parts.map(mapPart));
  }),
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const parseResult = createPartSchema.safeParse(req.body);

    if (!parseResult.success) {
      return fail(res, 400, 'Invalid payload', parseResult.error.flatten());
    }

    const tenantId = await resolveTenant(req);

    const created = await prisma.part.create({
      data: {
        tenantId,
        name: parseResult.data.name,
        sku: parseResult.data.sku,
        onHand: parseResult.data.onHand,
        minLevel: parseResult.data.minLevel,
        cost: parseResult.data.cost,
        vendor: parseResult.data.vendor,
      },
    });

    const normalized = mapPart(created);

    void emitTenantWebhookEvent(tenantId, 'inventory.part_created', {
      part: normalized,
    });

    return ok(res, normalized);
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const parseResult = updateQuantitySchema.safeParse(req.body);

    if (!parseResult.success) {
      return fail(res, 400, 'Invalid payload', parseResult.error.flatten());
    }

    const tenantId = await resolveTenant(req);
    const partId = normalizeObjectId(req.params.id, 'partId');

    const existing = await prisma.part.findFirst({
      where: { id: partId, tenantId },
    });

    if (!existing) {
      return fail(res, 404, 'Part not found');
    }

    const updated = await prisma.part.update({
      where: { id: partId },
      data: {
        onHand: parseResult.data.onHand,
        minLevel: parseResult.data.minLevel ?? existing.minLevel,
      },
    });

    const normalized = mapPart(updated);

    void emitTenantWebhookEvent(tenantId, 'inventory.level_changed', {
      partId: normalized.id,
      onHand: normalized.onHand,
      minLevel: normalized.minLevel,
    });

    return ok(res, normalized);
  }),
);

export default router;
