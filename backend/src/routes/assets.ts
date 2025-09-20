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

const createAssetSchema = z.object({
  stationId: z.string().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['operational', 'down', 'maintenance', 'retired']).default('operational'),
  criticality: z.number().min(1).max(5).default(3),
  meters: z.array(z.object({
    name: z.string(),
    value: z.number(),
    unit: z.string(),
  })).optional(),
  docsFolder: z.string().optional(),
});

const updateAssetSchema = createAssetSchema.partial();

const addMeterReadingSchema = z.object({
  name: z.string(),
  delta: z.number().optional(),
  value: z.number().optional(),
});

// GET /assets/tree
router.get('/tree', asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;

  const sites = await prisma.site.findMany({
    where: { tenantId },
    include: {
      areas: {
        include: {
          lines: {
            include: {
              stations: {
                include: {
                  assets: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return ok(res, { sites });
}));

// GET /assets/:id
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const asset = await prisma.asset.findFirst({
    where: { id, tenantId },
    include: {
      station: {
        include: {
          line: {
            include: {
              area: {
                include: {
                  site: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!asset) {
    return fail(res, 404, 'Asset not found');
  }

  return ok(res, {
    ...asset,
    meters: asset.meterJson as any,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  });
}));

// POST /assets
router.post('/', requireRoles(['planner', 'supervisor', 'admin']), asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const data = createAssetSchema.parse(req.body);

  const asset = await prisma.asset.create({
    data: {
      ...data,
      tenantId,
      meterJson: data.meters || [],
    },
  });

  await auditLog(tenantId, userId, 'create', 'asset', asset.id, null, asset);

  return ok(res, {
    ...asset,
    meters: asset.meterJson as any,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  });
}));

// PUT /assets/:id
router.put('/:id', requireRoles(['planner', 'supervisor', 'admin']), asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { id } = req.params;
  const data = updateAssetSchema.parse(req.body);

  const existing = await prisma.asset.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return fail(res, 404, 'Asset not found');
  }

  const updateData: any = { ...data };
  if (data.meters) {
    updateData.meterJson = data.meters;
    delete updateData.meters;
  }

  const asset = await prisma.asset.update({
    where: { id },
    data: updateData,
  });

  await auditLog(tenantId, userId, 'update', 'asset', id, existing, asset);

  return ok(res, {
    ...asset,
    meters: asset.meterJson as any,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  });
}));

// POST /assets/:id/meters
router.post('/:id/meters', requireRoles(['tech', 'planner', 'supervisor', 'admin']), asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { id } = req.params;
  const { name, delta, value } = addMeterReadingSchema.parse(req.body);

  const asset = await prisma.asset.findFirst({
    where: { id, tenantId },
  });

  if (!asset) {
    return fail(res, 404, 'Asset not found');
  }

  const meters = (asset.meterJson as any[]) || [];
  const meterIndex = meters.findIndex(m => m.name === name);

  if (meterIndex === -1) {
    return fail(res, 404, 'Meter not found');
  }

  const oldValue = meters[meterIndex].value;
  const newValue = value !== undefined ? value : oldValue + (delta || 0);
  
  meters[meterIndex] = {
    ...meters[meterIndex],
    value: newValue,
  };

  const updatedAsset = await prisma.asset.update({
    where: { id },
    data: {
      meterJson: meters,
    },
  });

  await auditLog(tenantId, userId, 'meter_reading', 'asset', id, 
    { meter: name, oldValue }, 
    { meter: name, newValue }
  );

  return ok(res, {
    ...updatedAsset,
    meters: updatedAsset.meterJson as any,
    createdAt: updatedAsset.createdAt.toISOString(),
    updatedAt: updatedAsset.updatedAt.toISOString(),
  });
}));

export default router;