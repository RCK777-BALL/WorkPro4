import { Router } from 'express';
import { z } from 'zod';
import type { Asset } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { asyncHandler } from '../utils/response';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(authenticateToken);

const assetStatusEnum = z.enum(['operational', 'maintenance', 'down', 'retired', 'decommissioned']);

const emptyToUndefined = (value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
};

const assetPayloadSchema = z.object({
  name: z.string().trim().min(1, 'Asset name is required'),
  code: z.string().trim().min(1, 'Asset code is required'),
  location: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  category: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  purchaseDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  cost: z.preprocess(emptyToUndefined, z.coerce.number().nonnegative().optional()),
  status: z.preprocess(emptyToUndefined, assetStatusEnum.optional()),
});

const updateAssetSchema = assetPayloadSchema.partial();

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
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const scope = buildTenantScope({ tenantId: req.user.tenantId, siteId: req.user.siteId ?? null });

    const assets = await prisma.asset.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ ok: true, assets: assets.map(serializeAsset) });
  }),
);

router.post(
  '/',
  auditLog('create', 'asset'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const payload = assetPayloadSchema.parse(req.body);
    const scope = buildTenantScope({ tenantId: req.user.tenantId, siteId: req.user.siteId ?? null });

    const asset = await prisma.asset.create({
      data: {
        tenantId: scope.tenantId,
        siteId: scope.siteId ?? undefined,
        code: payload.code,
        name: payload.name,
        location: payload.location,
        category: payload.category,
        purchaseDate: payload.purchaseDate,
        cost: payload.cost,
        status: payload.status ?? 'operational',
      },
    });

    res.locals.auditMetadata = {
      assetId: asset.id,
      status: asset.status,
    };

    return res.status(201).json({ ok: true, asset: serializeAsset(asset) });
  }),
);

router.patch(
  '/:id',
  auditLog('update', 'asset'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    updateAssetSchema.parse(req.body);

    const scope = buildTenantScope({ tenantId: req.user.tenantId, siteId: req.user.siteId ?? null });

    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, ...scope },
    });

    if (!asset) {
      return res.status(404).json({ ok: false, error: 'Asset not found' });
    }

    return res.status(501).json({ ok: false, error: 'Asset update not implemented yet' });
  }),
);

router.delete(
  '/:id',
  auditLog('delete', 'asset'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const scope = buildTenantScope({ tenantId: req.user.tenantId, siteId: req.user.siteId ?? null });

    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, ...scope },
    });

    if (!asset) {
      return res.status(404).json({ ok: false, error: 'Asset not found' });
    }

    return res.status(501).json({ ok: false, error: 'Asset deletion not implemented yet' });
  }),
);

export default router;
