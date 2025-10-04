import { Router } from 'express';
import { z } from 'zod';
import type { Asset, Prisma } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { asyncHandler } from '../utils/response';

const router = Router();

router.use(authenticateToken);

const assetStatusEnum = z.enum(['operational', 'maintenance', 'down', 'retired', 'decommissioned']);

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: assetStatusEnum.optional(),
  location: z.string().trim().optional(),
  category: z.string().trim().optional(),
  sort: z.enum(['createdAt:desc', 'createdAt:asc']).optional(),
});

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
    const { page, pageSize, search, status, location, category, sort } = querySchema.parse(req.query);

    const where: Prisma.AssetWhereInput = {
      ...scope,
      ...(status ? { status } : {}),
      ...(location
        ? {
            location: {
              contains: location,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(category
        ? {
            category: {
              contains: category,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        orderBy:
          sort === 'createdAt:asc'
            ? { createdAt: 'asc' }
            : { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return res.json({
      ok: true,
      assets: assets.map(serializeAsset),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  }),
);

router.post(
  '/',
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

    return res.status(201).json({ ok: true, asset: serializeAsset(asset) });
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const payload = assetPayloadSchema.parse(req.body);

    const scope = buildTenantScope({ tenantId: req.user.tenantId, siteId: req.user.siteId ?? null });

    const existing = await prisma.asset.findFirst({
      where: { id: req.params.id, ...scope },
    });

    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Asset not found' });
    }

    const updated = await prisma.asset.update({
      where: { id: existing.id },
      data: {
        code: payload.code,
        name: payload.name,
        location: payload.location,
        category: payload.category,
        purchaseDate: payload.purchaseDate,
        cost: payload.cost,
        status: payload.status ?? existing.status,
      },
    });

    return res.json({ ok: true, asset: serializeAsset(updated) });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const scope = buildTenantScope({ tenantId: req.user.tenantId, siteId: req.user.siteId ?? null });

    const existing = await prisma.asset.findFirst({
      where: { id: req.params.id, ...scope },
    });

    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Asset not found' });
    }

    const deleted = await prisma.asset.delete({ where: { id: existing.id } });

    return res.json({ ok: true, asset: serializeAsset(deleted) });
  }),
);

export default router;
