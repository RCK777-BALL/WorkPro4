import { Router } from 'express';
import { z } from 'zod';
import type { Asset } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { asyncHandler, fail, ok } from '../utils/response';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(authenticateToken);

const assetStatusEnum = z.enum(['operational', 'maintenance', 'down', 'retired', 'decommissioned']);

const normalizeOptionalString = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    return trimmed;
  }

  return value;
};

const normalizeOptionalNumber = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  return Number(value);
};

const normalizeOptionalDate = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  const date = new Date(value as any);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date;
};

const emptyToUndefined = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
};

const assetPayloadSchema = z
  .object({
    name: z.string().trim().min(1, 'Asset name is required'),
    code: z.string().trim().min(1, 'Asset code is required'),
    location: z.preprocess(
      normalizeOptionalString,
      z.union([z.string().trim().min(1), z.null()]).optional(),
    ),
    category: z.preprocess(
      normalizeOptionalString,
      z.union([z.string().trim().min(1), z.null()]).optional(),
    ),
    purchaseDate: z.preprocess(
      normalizeOptionalDate,
      z.union([z.coerce.date(), z.null()]).optional(),
    ),
    cost: z.preprocess(
      normalizeOptionalNumber,
      z.union([z.number().nonnegative(), z.null()]).optional(),
    ),
    status: z.preprocess(emptyToUndefined, assetStatusEnum.optional()),
  })
  .strict();

const updateAssetSchema = assetPayloadSchema.partial().strict();

type AssetStatus = z.infer<typeof assetStatusEnum>;

const immutableTransitionError = 'Asset status cannot transition from its current state to the requested status.';

function assertValidStatusTransition(current: AssetStatus, next: AssetStatus | undefined): string | null {
  if (!next || current === next) {
    return null;
  }

  if (current === 'decommissioned') {
    return immutableTransitionError;
  }

  if (current === 'retired' && next !== 'decommissioned') {
    return immutableTransitionError;
  }

  if (next === 'operational' && (current === 'retired' || current === 'decommissioned')) {
    return immutableTransitionError;
  }

  if (next === 'maintenance' && current === 'decommissioned') {
    return immutableTransitionError;
  }

  if (next === 'down' && current === 'decommissioned') {
    return immutableTransitionError;
  }

  return null;
}

type TenantScopedWhere = {
  tenantId: string;
  siteId?: string | null;
};

function buildTenantScope({ tenantId, siteId }: TenantScopedWhere): {
  tenantId: string;
  siteId?: string | null;
} {
  return siteId ? { tenantId, siteId } : { tenantId };
}

function serializeAsset(asset: Asset) {
  return {
    id: asset.id,
    tenantId: asset.tenantId,
    siteId: asset.siteId ?? null,
    code: asset.code,
    name: asset.name,
    location: asset.location ?? null,
    category: asset.category ?? null,
    purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString() : null,
    cost: asset.cost ?? null,
    status: asset.status,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const scope = buildTenantScope({ tenantId: req.user.tenantId, siteId: req.user.siteId ?? null });

    const assets = await prisma.asset.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
    });

    return ok(res, assets.map(serializeAsset));
  }),
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const payload = assetPayloadSchema.parse(req.body);
    const scope = buildTenantScope({ tenantId: req.user.tenantId, siteId: req.user.siteId ?? null });

    const asset = await prisma.asset.create({
      data: {
        tenantId: scope.tenantId,
        siteId: scope.siteId ?? undefined,
        code: payload.code,
        name: payload.name,
        location: payload.location ?? undefined,
        category: payload.category ?? undefined,
        purchaseDate: payload.purchaseDate ?? undefined,
        cost: payload.cost ?? undefined,
        status: payload.status ?? 'operational',
      },
    });

    await auditLog('asset.created', {
      assetId: asset.id,
      tenantId: asset.tenantId,
      userId: req.user.id,
    });

    res.status(201);
    return ok(res, serializeAsset(asset));
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const parseResult = updateAssetSchema.safeParse(req.body);

    if (!parseResult.success) {
      return fail(res, 400, 'Validation error', parseResult.error.format());
    }

    const payload = parseResult.data;

    if (Object.keys(payload).length === 0) {
      return fail(res, 400, 'No fields provided for update');
    }

    const scope = buildTenantScope({ tenantId: req.user.tenantId, siteId: req.user.siteId ?? null });

    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, ...scope },
    });

    if (!asset) {
      return fail(res, 404, 'Asset not found');
    }

    const transitionError = assertValidStatusTransition(asset.status as AssetStatus, payload.status);

    if (transitionError) {
      return fail(res, 409, transitionError);
    }

    const data: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      data.name = payload.name;
    }

    if (payload.code !== undefined) {
      data.code = payload.code;
    }

    if ('location' in payload) {
      data.location = payload.location;
    }

    if ('category' in payload) {
      data.category = payload.category;
    }

    if ('purchaseDate' in payload) {
      data.purchaseDate = payload.purchaseDate ?? null;
    }

    if ('cost' in payload) {
      data.cost = payload.cost ?? null;
    }

    if (payload.status !== undefined) {
      data.status = payload.status;
    }

    if (Object.keys(data).length === 0) {
      return fail(res, 400, 'No valid fields to update');
    }

    const updated = await prisma.asset.update({
      where: { id: asset.id },
      data,
    });

    await auditLog('asset.updated', {
      assetId: updated.id,
      tenantId: updated.tenantId,
      userId: req.user.id,
      changes: data,
    });

    return ok(res, serializeAsset(updated));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const scope = buildTenantScope({ tenantId: req.user.tenantId, siteId: req.user.siteId ?? null });

    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, ...scope },
    });

    if (!asset) {
      return fail(res, 404, 'Asset not found');
    }

    await prisma.asset.delete({
      where: { id: asset.id },
    });

    await auditLog('asset.deleted', {
      assetId: asset.id,
      tenantId: asset.tenantId,
      userId: req.user.id,
    });

    return ok(res, { id: asset.id });
  }),
);

export default router;
