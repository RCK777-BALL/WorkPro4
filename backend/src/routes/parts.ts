import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { asyncHandler, fail, ok } from '../utils/response';
import { ensureDefaultWarehouse } from '../services/warehouse';

const router = Router();

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/iu;

const emptyToUndefined = (value: unknown) => {
  if (value === '' || value === null) {
    return undefined;
  }
  return value;
};

const objectIdSchema = z
  .string()
  .trim()
  .regex(OBJECT_ID_REGEX, 'Value must be a valid Mongo object id');

const optionalInt = z
  .preprocess(emptyToUndefined, z.coerce.number().int().min(0))
  .optional();

const optionalNumber = z
  .preprocess(emptyToUndefined, z.coerce.number().min(0))
  .optional();

const partPayloadSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required'),
  name: z.string().trim().min(1, 'Part name is required'),
  description: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  unitOfMeasure: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  min: optionalInt,
  max: optionalInt,
  cost: optionalNumber,
  vendorId: objectIdSchema.optional(),
});

const createPartSchema = partPayloadSchema
  .extend({
    onHand: optionalInt,
    warehouseId: objectIdSchema.optional(),
  })
  .refine(
    (value) =>
      value.max == null ||
      value.min == null ||
      Number.isNaN(value.max) ||
      Number.isNaN(value.min) ||
      value.max >= value.min,
    {
      message: 'Max level must be greater than or equal to min level',
      path: ['max'],
    },
  );

const updatePartSchema = partPayloadSchema
  .extend({ warehouseId: objectIdSchema.optional() })
  .partial()
  .refine(
    (value) =>
      value.max == null ||
      value.min == null ||
      Number.isNaN(value.max) ||
      Number.isNaN(value.min) ||
      value.max >= value.min,
    {
      message: 'Max level must be greater than or equal to min level',
      path: ['max'],
    },
  );

const adjustSchema = z.object({
  delta: z.preprocess(emptyToUndefined, z.coerce.number().int()).refine((val) => !Number.isNaN(val), {
    message: 'Adjustment amount is required',
  }),
  reason: z.string().trim().min(1, 'Adjustment reason is required'),
  warehouseId: objectIdSchema.optional(),
  workOrderId: objectIdSchema.optional(),
});

const partInclude = {
  preferredVendor: {
    select: {
      id: true,
      name: true,
    },
  },
  stockLevels: {
    include: {
      warehouse: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.PartInclude;

type PartWithRelations = Prisma.PartGetPayload<{ include: typeof partInclude }>;

type StockLevelWithWarehouse = PartWithRelations['stockLevels'][number];

function sumOnHand(levels: StockLevelWithWarehouse[]): number {
  return levels.reduce((sum, level) => sum + level.onHand, 0);
}

function sumOnOrder(levels: StockLevelWithWarehouse[]): number {
  return levels.reduce((sum, level) => sum + level.onOrder, 0);
}

function serializePart(part: PartWithRelations) {
  const totalOnHand = sumOnHand(part.stockLevels);
  return {
    id: part.id,
    tenantId: part.tenantId,
    sku: part.sku,
    name: part.name,
    description: part.description ?? null,
    min: part.defaultMinLevel,
    max: part.defaultMaxLevel,
    onHand: totalOnHand,
    onOrder: sumOnOrder(part.stockLevels),
    cost: part.cost ?? null,
    vendorId: part.preferredVendorId ?? undefined,
    createdAt: part.createdAt.toISOString(),
    updatedAt: part.updatedAt.toISOString(),
    vendor: part.preferredVendor
      ? {
          id: part.preferredVendor.id,
          name: part.preferredVendor.name,
        }
      : undefined,
  };
}

function buildLowStockAlerts(part: PartWithRelations) {
  return part.stockLevels
    .filter((level) => {
      const threshold = level.minLevel ?? part.defaultMinLevel ?? 0;
      return threshold > 0 && level.onHand < threshold;
    })
    .map((level) => ({
      partId: part.id,
      sku: part.sku,
      name: part.name,
      warehouseId: level.warehouseId,
      warehouseName: level.warehouse?.name ?? 'Main Warehouse',
      onHand: level.onHand,
      minLevel: level.minLevel ?? part.defaultMinLevel ?? 0,
    }));
}

async function findPartById(id: string, tenantId: string) {
  return prisma.part.findFirst({
    where: { id, tenantId },
    include: partInclude,
  });
}

router.use(authenticateToken);

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = req.user!.tenantId;

    const parts = await prisma.part.findMany({
      where: { tenantId },
      include: partInclude,
      orderBy: { name: 'asc' },
    });

    const serialized = parts.map(serializePart);
    const lowStockAlerts = parts.flatMap(buildLowStockAlerts);
    const inventoryValue = parts.reduce((sum, part) => sum + sumOnHand(part.stockLevels) * (part.cost ?? 0), 0);
    const backordered = parts.filter((part) => part.stockLevels.some((level) => level.onOrder > 0)).length;

    return ok(res, {
      parts: serialized,
      stats: {
        totalSkus: parts.length,
        lowStock: lowStockAlerts.length,
        backordered,
        inventoryValue,
      },
      lowStock: lowStockAlerts,
    });
  }),
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = req.user!.tenantId;
    const payload = createPartSchema.parse(req.body);

    if (payload.vendorId) {
      const vendor = await prisma.vendor.findFirst({ where: { id: payload.vendorId, tenantId } });
      if (!vendor) {
        return fail(res, 404, 'Vendor not found');
      }
    }

    let warehouseId: string | null = payload.warehouseId ?? null;

    if (warehouseId) {
      const warehouse = await prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId } });
      if (!warehouse) {
        return fail(res, 404, 'Warehouse not found');
      }
    } else {
      const defaultWarehouse = await ensureDefaultWarehouse(tenantId);
      warehouseId = defaultWarehouse.id;
    }

    const resolvedWarehouseId = warehouseId as string;

    try {
      const part = await prisma.part.create({
        data: {
          tenantId,
          sku: payload.sku,
          name: payload.name,
          description: payload.description,
          unitOfMeasure: payload.unitOfMeasure,
          cost: payload.cost,
          defaultMinLevel: payload.min ?? 0,
          defaultMaxLevel: payload.max ?? 0,
          preferredVendorId: payload.vendorId,
          stockLevels: {
            create: {
              tenantId,
              warehouseId: resolvedWarehouseId,
              minLevel: payload.min ?? 0,
              maxLevel: payload.max ?? 0,
              onHand: payload.onHand ?? 0,
            },
          },
        },
        include: partInclude,
      });

      return ok(res.status(201), serializePart(part));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return fail(res, 409, 'A part with this SKU already exists');
      }
      throw error;
    }
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = req.user!.tenantId;
    const payload = updatePartSchema.parse(req.body);
    const { id } = req.params;

    const existing = await findPartById(id, tenantId);
    if (!existing) {
      return fail(res, 404, 'Part not found');
    }

    if (payload.vendorId) {
      const vendor = await prisma.vendor.findFirst({ where: { id: payload.vendorId, tenantId } });
      if (!vendor) {
        return fail(res, 404, 'Vendor not found');
      }
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.part.update({
          where: { id: existing.id },
          data: {
            sku: payload.sku ?? undefined,
            name: payload.name ?? undefined,
            description: payload.description ?? undefined,
            unitOfMeasure: payload.unitOfMeasure ?? undefined,
            cost: payload.cost ?? undefined,
            defaultMinLevel: payload.min ?? existing.defaultMinLevel,
            defaultMaxLevel: payload.max ?? existing.defaultMaxLevel,
            preferredVendorId: payload.vendorId ?? existing.preferredVendorId ?? undefined,
          },
        });

        if (payload.min != null || payload.max != null) {
          await tx.stockLevel.updateMany({
            where: { partId: existing.id },
            data: {
              ...(payload.min != null ? { minLevel: payload.min } : {}),
              ...(payload.max != null ? { maxLevel: payload.max } : {}),
            },
          });
        }

        return tx.part.findUniqueOrThrow({ where: { id: existing.id }, include: partInclude });
      });

      return ok(res, serializePart(updated));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return fail(res, 409, 'A part with this SKU already exists');
      }
      throw error;
    }
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const existing = await findPartById(id, tenantId);
    if (!existing) {
      return fail(res, 404, 'Part not found');
    }

    await prisma.part.delete({ where: { id: existing.id } });

    return ok(res, { success: true });
  }),
);

router.post(
  '/:id/adjust',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const payload = adjustSchema.parse(req.body);

    const part = await findPartById(id, tenantId);
    if (!part) {
      return fail(res, 404, 'Part not found');
    }

    let warehouseId: string | null = payload.warehouseId ?? null;

    if (warehouseId) {
      const warehouse = await prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId } });
      if (!warehouse) {
        return fail(res, 404, 'Warehouse not found');
      }
    } else {
      const defaultWarehouse = await ensureDefaultWarehouse(tenantId);
      warehouseId = defaultWarehouse.id;
    }

    const resolvedWarehouseId = warehouseId as string;

    const stockLevel = await prisma.stockLevel.findFirst({
      where: {
        tenantId,
        partId: part.id,
        warehouseId: resolvedWarehouseId,
      },
    });

    const newQuantity = (stockLevel?.onHand ?? 0) + payload.delta;
    if (newQuantity < 0) {
      return fail(res, 400, 'Adjustment would result in negative stock');
    }

    await prisma.$transaction(async (tx) => {
      if (stockLevel) {
        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: { onHand: newQuantity },
        });
      } else {
        await tx.stockLevel.create({
          data: {
            tenantId,
            partId: part.id,
            warehouseId: resolvedWarehouseId,
            onHand: newQuantity,
            minLevel: part.defaultMinLevel,
            maxLevel: part.defaultMaxLevel,
          },
        });
      }

      await tx.part.update({
        where: { id: part.id },
        data: { updatedAt: new Date() },
      });
    });

    const updated = await findPartById(id, tenantId);
    return ok(res, serializePart(updated!));
  }),
);

export default router;
