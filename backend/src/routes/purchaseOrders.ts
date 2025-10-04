import { Router } from 'express';
import { z } from 'zod';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
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

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());
const optionalNumber = z.preprocess(emptyToUndefined, z.coerce.number().min(0)).optional();
const quantitySchema = z.preprocess(emptyToUndefined, z.coerce.number().int().positive());

const purchaseOrderLineSchema = z.object({
  partId: objectIdSchema,
  quantity: quantitySchema,
  unitCost: optionalNumber,
  warehouseId: objectIdSchema.optional(),
});

const createPurchaseOrderSchema = z.object({
  vendorId: objectIdSchema,
  status: z.nativeEnum(PurchaseOrderStatus).optional(),
  number: optionalString,
  notes: optionalString,
  orderedAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  lines: z.array(purchaseOrderLineSchema).min(1, 'At least one line is required'),
});

const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial().extend({
  status: z.nativeEnum(PurchaseOrderStatus).optional(),
});

const receiveSchema = z.object({
  receivedAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  lines: z
    .array(
      z.object({
        partId: objectIdSchema,
        quantity: quantitySchema,
        warehouseId: objectIdSchema.optional(),
      }),
    )
    .min(1, 'At least one line must be provided for receipt'),
});

const purchaseOrderInclude = {
  vendor: {
    select: {
      id: true,
      name: true,
    },
  },
  lines: {
    include: {
      part: {
        select: {
          id: true,
          name: true,
          sku: true,
        },
      },
      warehouse: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.PurchaseOrderInclude;

type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{ include: typeof purchaseOrderInclude }>;

type TransactionClient = Prisma.TransactionClient;

router.use(authenticateToken);

function serializePurchaseOrder(order: PurchaseOrderWithRelations) {
  const subtotal = order.lines.reduce((sum, line) => sum + (line.unitCost ?? 0) * line.quantity, 0);
  const totalReceived = order.lines.reduce((sum, line) => sum + line.receivedQty, 0);
  const totalOrdered = order.lines.reduce((sum, line) => sum + line.quantity, 0);

  return {
    id: order.id,
    tenantId: order.tenantId,
    vendorId: order.vendorId,
    status: order.status,
    poNumber: order.number ?? order.id,
    number: order.number,
    notes: order.notes ?? null,
    orderedAt: order.orderedAt ? order.orderedAt.toISOString() : null,
    receivedAt: order.receivedAt ? order.receivedAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    subtotal,
    tax: 0,
    shipping: 0,
    total: subtotal,
    receiptProgress: totalOrdered === 0 ? 0 : totalReceived / totalOrdered,
    vendor: order.vendor
      ? {
          id: order.vendor.id,
          name: order.vendor.name,
        }
      : null,
    lines: order.lines.map((line) => ({
      id: line.id,
      partId: line.partId,
      qty: line.quantity,
      receivedQty: line.receivedQty,
      unitCost: line.unitCost ?? 0,
      warehouseId: line.warehouseId ?? null,
    })),
    linesWithDetails: order.lines.map((line) => ({
      partName: line.part?.name ?? 'Unknown part',
      partSku: line.part?.sku ?? '',
      quantity: line.quantity,
      unitCost: line.unitCost ?? 0,
      receivedQty: line.receivedQty,
      warehouseName: line.warehouse?.name ?? null,
    })),
  };
}

async function ensureVendorExists(tenantId: string, vendorId: string) {
  const vendor = await prisma.vendor.findFirst({ where: { tenantId, id: vendorId } });
  if (!vendor) {
    throw new Error('Vendor not found');
  }
}

async function ensurePartsExist(tenantId: string, partIds: string[]) {
  const uniqueIds = Array.from(new Set(partIds));
  if (uniqueIds.length === 0) {
    return;
  }

  const parts = await prisma.part.findMany({ where: { tenantId, id: { in: uniqueIds } } });
  if (parts.length !== uniqueIds.length) {
    throw new Error('One or more parts were not found for this tenant');
  }
}

async function ensureWarehousesExist(tenantId: string, warehouseIds: string[]) {
  const uniqueIds = Array.from(new Set(warehouseIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return;
  }

  const warehouses = await prisma.warehouse.findMany({ where: { tenantId, id: { in: uniqueIds } } });
  if (warehouses.length !== uniqueIds.length) {
    throw new Error('One or more warehouses were not found for this tenant');
  }
}

async function recalcOnOrder(tx: TransactionClient, tenantId: string, partId: string) {
  const openLines = await tx.purchaseOrderLine.findMany({
    where: {
      tenantId,
      partId,
      purchaseOrder: {
        tenantId,
        status: { in: [PurchaseOrderStatus.issued] },
      },
    },
    select: {
      quantity: true,
      receivedQty: true,
    },
  });

  const onOrder = openLines.reduce((sum, line) => sum + Math.max(line.quantity - line.receivedQty, 0), 0);

  const updateResult = await tx.stockLevel.updateMany({
    where: { tenantId, partId },
    data: { onOrder },
  });

  if (updateResult.count === 0 && (onOrder > 0 || openLines.length > 0)) {
    const defaultWarehouse = await ensureDefaultWarehouse(tenantId, tx);
    const part = await tx.part.findUnique({ where: { id: partId } });

    if (part) {
      await tx.stockLevel.create({
        data: {
          tenantId,
          partId,
          warehouseId: defaultWarehouse.id,
          onHand: 0,
          onOrder,
          minLevel: part.defaultMinLevel,
          maxLevel: part.defaultMaxLevel,
        },
      });
    }
  }
}

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = req.user!.tenantId;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;

    const where: Prisma.PurchaseOrderWhereInput = {
      tenantId,
    };

    if (status && Object.values(PurchaseOrderStatus).includes(status as PurchaseOrderStatus)) {
      where.status = status as PurchaseOrderStatus;
    }

    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { vendor: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: purchaseOrderInclude,
      orderBy: { createdAt: 'desc' },
    });

    return ok(res, orders.map(serializePurchaseOrder));
  }),
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = req.user!.tenantId;
    const payload = createPurchaseOrderSchema.parse(req.body);

    try {
      await ensureVendorExists(tenantId, payload.vendorId);
      await ensurePartsExist(tenantId, payload.lines.map((line) => line.partId));
      await ensureWarehousesExist(
        tenantId,
        payload.lines.map((line) => line.warehouseId).filter(Boolean) as string[],
      );
    } catch (error) {
      return fail(res, 404, error instanceof Error ? error.message : 'Invalid references provided');
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          tenantId,
          vendorId: payload.vendorId,
          status: payload.status ?? PurchaseOrderStatus.draft,
          number: payload.number,
          notes: payload.notes,
          orderedAt: payload.orderedAt ?? (payload.status === PurchaseOrderStatus.issued ? new Date() : undefined),
          lines: {
            create: payload.lines.map((line) => ({
              tenantId,
              partId: line.partId,
              warehouseId: line.warehouseId,
              quantity: line.quantity,
              unitCost: line.unitCost,
            })),
          },
        },
        include: purchaseOrderInclude,
      });

      const partIds = Array.from(new Set(payload.lines.map((line) => line.partId)));
      await Promise.all(partIds.map((partId) => recalcOnOrder(tx, tenantId, partId)));

      return created;
    });

    return ok(res.status(201), serializePurchaseOrder(order));
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const payload = updatePurchaseOrderSchema.parse(req.body);

    const existing = await prisma.purchaseOrder.findFirst({
      where: { tenantId, id },
      include: {
        lines: true,
      },
    });

    if (!existing) {
      return fail(res, 404, 'Purchase order not found');
    }

    if (payload.vendorId) {
      try {
        await ensureVendorExists(tenantId, payload.vendorId);
      } catch (error) {
        return fail(res, 404, error instanceof Error ? error.message : 'Vendor not found');
      }
    }

    if (payload.lines) {
      try {
        await ensurePartsExist(tenantId, payload.lines.map((line) => line.partId));
        await ensureWarehousesExist(
          tenantId,
          payload.lines.map((line) => line.warehouseId).filter(Boolean) as string[],
        );
      } catch (error) {
        return fail(res, 404, error instanceof Error ? error.message : 'Invalid line references');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: existing.id },
        data: {
          vendorId: payload.vendorId ?? undefined,
          status: payload.status ?? undefined,
          number: payload.number ?? undefined,
          notes: payload.notes ?? undefined,
          orderedAt:
            payload.orderedAt ??
            (payload.status && payload.status === PurchaseOrderStatus.issued && !existing.orderedAt
              ? new Date()
              : undefined),
        },
      });

      const touchedPartIds = new Set<string>();

      if (payload.lines) {
        await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: existing.id } });

        for (const line of payload.lines) {
          const matchingExisting = existing.lines.find((l) => l.partId === line.partId);
          await tx.purchaseOrderLine.create({
            data: {
              tenantId,
              purchaseOrderId: existing.id,
              partId: line.partId,
              warehouseId: line.warehouseId,
              quantity: line.quantity,
              unitCost: line.unitCost,
              receivedQty: Math.min(matchingExisting?.receivedQty ?? 0, line.quantity),
            },
          });
          touchedPartIds.add(line.partId);
        }
      } else {
        for (const line of existing.lines) {
          touchedPartIds.add(line.partId);
        }
      }

      if (payload.status === PurchaseOrderStatus.closed || payload.status === PurchaseOrderStatus.received) {
        await tx.purchaseOrder.update({
          where: { id: existing.id },
          data: {
            receivedAt: payload.status === PurchaseOrderStatus.received ? new Date() : updatedOrder.receivedAt,
          },
        });
      }

      const reloaded = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id: existing.id },
        include: purchaseOrderInclude,
      });

      await Promise.all(Array.from(touchedPartIds).map((partId) => recalcOnOrder(tx, tenantId, partId)));

      return reloaded;
    });

    return ok(res, serializePurchaseOrder(updated));
  }),
);

router.post(
  '/:id/receive',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const payload = receiveSchema.parse(req.body);

    const existing = await prisma.purchaseOrder.findFirst({
      where: { tenantId, id },
      include: {
        lines: true,
      },
    });

    if (!existing) {
      return fail(res, 404, 'Purchase order not found');
    }

    const order = await prisma.$transaction(async (tx) => {
      const partIds = new Set<string>();

      for (const lineReceipt of payload.lines) {
        const line = existing.lines.find((l) => l.partId === lineReceipt.partId);
        if (!line) {
          throw new Error(`Part ${lineReceipt.partId} is not on this purchase order`);
        }

        const remaining = Math.max(line.quantity - line.receivedQty, 0);
        const toReceive = Math.min(lineReceipt.quantity, remaining);

        if (toReceive <= 0) {
          continue;
        }

        let warehouseId = lineReceipt.warehouseId ?? line.warehouseId ?? null;
        if (!warehouseId) {
          const defaultWarehouse = await ensureDefaultWarehouse(tenantId, tx);
          warehouseId = defaultWarehouse.id;
        }

        const part = await tx.part.findUniqueOrThrow({ where: { id: line.partId } });
        const stockLevel = await tx.stockLevel.findFirst({
          where: {
            tenantId,
            partId: line.partId,
            warehouseId,
          },
        });

        if (stockLevel) {
          await tx.stockLevel.update({
            where: { id: stockLevel.id },
            data: {
              onHand: stockLevel.onHand + toReceive,
            },
          });
        } else {
          await tx.stockLevel.create({
            data: {
              tenantId,
              partId: line.partId,
              warehouseId,
              onHand: toReceive,
              minLevel: part.defaultMinLevel,
              maxLevel: part.defaultMaxLevel,
            },
          });
        }

        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: {
            receivedQty: line.receivedQty + toReceive,
            warehouseId,
          },
        });

        partIds.add(line.partId);
      }

      const allLines = await tx.purchaseOrderLine.findMany({
        where: { purchaseOrderId: existing.id },
      });

      const fullyReceived = allLines.every((line) => line.receivedQty >= line.quantity);

      await tx.purchaseOrder.update({
        where: { id: existing.id },
        data: {
          status: fullyReceived ? PurchaseOrderStatus.received : existing.status,
          receivedAt: payload.receivedAt ? payload.receivedAt : fullyReceived ? new Date() : existing.receivedAt,
        },
      });

      const refreshed = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id: existing.id },
        include: purchaseOrderInclude,
      });

      await Promise.all(Array.from(partIds).map((partId) => recalcOnOrder(tx, tenantId, partId)));

      return refreshed;
    });

    return ok(res, serializePurchaseOrder(order));
  }),
);

export default router;
