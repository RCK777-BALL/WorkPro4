import { Router } from 'express';
import { z } from 'zod';
import type { Asset, Prisma } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { asyncHandler, fail, ok } from '../utils/response';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(authenticateToken);

const assetStatusEnum = z.enum(['operational', 'maintenance', 'down', 'retired', 'decommissioned']);
const objectIdRegex = /^[a-f\d]{24}$/iu;

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
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  return value;
};

  if (value === null) {
    return null;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
};

const normalizeNullableDate = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? value : value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed;
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

type TenantScopedWhere = {
  tenantId: string;
  siteId?: string | null;
};

function buildTenantScope({ tenantId, siteId }: TenantScopedWhere): Prisma.AssetWhereInput {
  return siteId ? { tenantId, siteId } : { tenantId };
}

function serializeLocation(entity?: { id: string; name: string; code?: string | null } | null) {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    name: entity.name,
    code: entity.code ?? null,
  };
}

function serializeAsset(asset: AssetWithRelations) {
  return {
    id: asset.id,
    tenantId: asset.tenantId,
    code: asset.code,
    name: asset.name,
    status: asset.status,
    criticality: asset.criticality,
    manufacturer: asset.manufacturer ?? null,
    modelNumber: asset.modelNumber ?? null,
    serialNumber: asset.serialNumber ?? null,
    site: serializeLocation(asset.site),
    area: serializeLocation(asset.area),
    line: serializeLocation(asset.line),
    station: serializeLocation(asset.station),
    purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString() : null,
    commissionedAt: asset.commissionedAt ? asset.commissionedAt.toISOString() : null,
    warrantyExpiresAt: asset.warrantyExpiresAt ? asset.warrantyExpiresAt.toISOString() : null,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

function serializeBomLine(line: AssetBomItem) {
  return {
    id: line.id,
    tenantId: line.tenantId,
    assetId: line.assetId,
    position: line.position,
    reference: line.reference,
    description: line.description,
    quantity: line.quantity ?? null,
    unit: line.unit ?? null,
    notes: line.notes ?? null,
    createdAt: line.createdAt.toISOString(),
    updatedAt: line.updatedAt.toISOString(),
  };
}

function serializeAssetLifecycle(asset: AssetWithLifecycle) {
  const base = serializeAsset(asset);
  return {
    ...base,
    location: asset.location ?? null,
    category: asset.category ?? null,
    cost: asset.cost ?? null,
    warrantyProvider: asset.warrantyProvider ?? null,
    warrantyContact: asset.warrantyContact ?? null,
    warrantyNotes: asset.warrantyNotes ?? null,
    bomLines: [...asset.bomItems].sort((a, b) => a.position - b.position).map(serializeBomLine),
  };
}

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
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
  auditLog('create', 'asset'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const payload = createAssetSchema.parse(req.body);

    const asset = await prisma.asset.create({
      data: {
        tenantId: req.user.tenantId,
        siteId: payload.siteId ?? null,
        areaId: payload.areaId ?? null,
        lineId: payload.lineId ?? null,
        stationId: payload.stationId ?? null,
        code: payload.code,
        name: payload.name,
        location: payload.location ?? undefined,
        category: payload.category ?? undefined,
        purchaseDate: payload.purchaseDate ?? undefined,
        cost: payload.cost ?? undefined,
        status: payload.status ?? 'operational',
        criticality: payload.criticality ?? 3,
        manufacturer: payload.manufacturer ?? null,
        modelNumber: payload.modelNumber ?? null,
        serialNumber: payload.serialNumber ?? null,
        commissionedAt: payload.commissionedAt ?? undefined,
        warrantyProvider: payload.warrantyProvider ?? null,
        warrantyContact: payload.warrantyContact ?? null,
        warrantyExpiresAt: payload.warrantyExpiresAt ?? undefined,
        warrantyNotes: payload.warrantyNotes ?? null,
      },
      include: {
        site: true,
        area: true,
        line: true,
        station: true,
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

router.put(
  '/:id',
  auditLog('update', 'asset'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const payload = assetPayloadSchema.parse(req.body);

    if (!asset) {
      return fail(res, 404, 'Asset not found');
    }

    return ok(res, serializeAssetLifecycle(asset));
  }),
);

router.get(
  '/:id/lifecycle',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

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

router.get(
  '/:id/bom',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      select: { id: true },
    });

    if (!asset) {
      return fail(res, 404, 'Asset not found');
    }

    const lines = await prisma.assetBomItem.findMany({
      where: { assetId: asset.id },
      orderBy: { position: 'asc' },
    });

    return ok(res, { lines: lines.map(serializeBomLine) });
  }),
);

async function updateBomLines(
  tx: Prisma.TransactionClient,
  assetId: string,
  tenantId: string,
  bomLines: z.infer<typeof bomLineSchema>[],
) {
  const normalized = bomLines.map((line, index) => ({
    ...line,
    position: line.position ?? index,
  }));

  const existing = await tx.assetBomItem.findMany({
    where: { assetId },
    select: { id: true },
  });

  const existingIds = new Set(existing.map((item) => item.id));
  const incomingIds = new Set(
    normalized
      .map((line) => line.id)
      .filter((value): value is string => typeof value === 'string' && existingIds.has(value) && objectIdRegex.test(value)),
  );

  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

  if (toDelete.length > 0) {
    await tx.assetBomItem.deleteMany({ where: { id: { in: toDelete } } });
  }

  for (const line of normalized) {
    const data = {
      position: line.position ?? 0,
      reference: line.reference,
      description: line.description,
      quantity: line.quantity ?? null,
      unit: line.unit ?? null,
      notes: line.notes ?? null,
    } satisfies Prisma.AssetBomItemUpdateInput;

    if (line.id && incomingIds.has(line.id)) {
      await tx.assetBomItem.update({
        where: { id: line.id },
        data,
      });
    } else {
      await tx.assetBomItem.create({
        data: {
          tenantId,
          assetId,
          ...data,
        },
      });
    }
  }
}

async function handleLifecycleUpdate(req: AuthRequest, res: Parameters<typeof fail>[0]) {
  if (!req.user) {
    return fail(res, 401, 'Authentication required');
  }

  const payload = lifecycleUpdateSchema.parse(req.body);
  const asset = await assertAssetAccess(req, req.params.id);

  if (!asset) {
    return fail(res, 404, 'Asset not found');
  }

  const updateData: Prisma.AssetUpdateInput = {};

  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.code !== undefined) updateData.code = payload.code;
  if (payload.location !== undefined) updateData.location = payload.location;
  if (payload.category !== undefined) updateData.category = payload.category;
  if (payload.purchaseDate !== undefined) updateData.purchaseDate = payload.purchaseDate;
  if (payload.cost !== undefined) updateData.cost = payload.cost;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.criticality !== undefined) updateData.criticality = payload.criticality ?? asset.criticality;
  if (payload.manufacturer !== undefined) updateData.manufacturer = payload.manufacturer;
  if (payload.modelNumber !== undefined) updateData.modelNumber = payload.modelNumber;
  if (payload.serialNumber !== undefined) updateData.serialNumber = payload.serialNumber;
  if (payload.commissionedAt !== undefined) updateData.commissionedAt = payload.commissionedAt;
  if (payload.warrantyProvider !== undefined) updateData.warrantyProvider = payload.warrantyProvider;
  if (payload.warrantyContact !== undefined) updateData.warrantyContact = payload.warrantyContact;
  if (payload.warrantyExpiresAt !== undefined) updateData.warrantyExpiresAt = payload.warrantyExpiresAt;
  if (payload.warrantyNotes !== undefined) updateData.warrantyNotes = payload.warrantyNotes;

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx.asset.update({
        where: { id: asset.id },
        data: updateData,
      });
    }

    if (payload.bomLines) {
      await updateBomLines(tx, asset.id, asset.tenantId, payload.bomLines);
    }

    const refreshed = await tx.asset.findUnique({
      where: { id: asset.id },
      include: {
        site: true,
        area: true,
        line: true,
        station: true,
        bomItems: true,
      },
    });

    if (!refreshed) {
      throw new Error('Asset disappeared while updating.');
    }

    return refreshed;
  });

  return ok(res, serializeAssetLifecycle(updated));
}

router.patch(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => handleLifecycleUpdate(req, res)),
);

router.patch(
  '/:id/lifecycle',
  asyncHandler(async (req: AuthRequest, res) => handleLifecycleUpdate(req, res)),
);

router.delete(
  '/:id',
  auditLog('delete', 'asset'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
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
