import type { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../db';

type WarehouseClient = PrismaClient | Prisma.TransactionClient;

export async function ensureDefaultWarehouse(tenantId: string, client: WarehouseClient = prisma) {
  const existing = await client.warehouse.findFirst({
    where: { tenantId, isDefault: true },
  });

  if (existing) {
    return existing;
  }

  return client.warehouse.create({
    data: {
      tenantId,
      name: 'Main Warehouse',
      code: 'MAIN',
      isDefault: true,
    },
  });
}
