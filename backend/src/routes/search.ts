import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ok, asyncHandler } from '../utils/response';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(tenantScope);

// GET /search
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const { q } = req.query;

  if (!q || typeof q !== 'string' || q.length < 2) {
    return ok(res, []);
  }

  const searchTerm = q.toLowerCase();

  // Search across multiple entities
  const [assets, workOrders, parts, vendors] = await Promise.all([
    prisma.asset.findMany({
      where: {
        tenantId,
        OR: [
          { code: { contains: searchTerm, mode: 'insensitive' } },
          { name: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: { id: true, code: true, name: true },
      take: 3,
    }),
    prisma.workOrder.findMany({
      where: {
        tenantId,
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, status: true },
      take: 3,
    }),
    prisma.part.findMany({
      where: {
        tenantId,
        OR: [
          { sku: { contains: searchTerm, mode: 'insensitive' } },
          { name: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: { id: true, sku: true, name: true },
      take: 2,
    }),
    prisma.vendor.findMany({
      where: {
        tenantId,
        name: { contains: searchTerm, mode: 'insensitive' },
      },
      select: { id: true, name: true },
      take: 2,
    }),
  ]);

  const results = [
    ...assets.map(asset => ({
      id: asset.id,
      type: 'asset' as const,
      title: `${asset.code} - ${asset.name}`,
      subtitle: 'Asset',
      url: `/assets/${asset.id}`,
    })),
    ...workOrders.map(wo => ({
      id: wo.id,
      type: 'work_order' as const,
      title: wo.title,
      subtitle: `Work Order - ${wo.status}`,
      url: `/work-orders/${wo.id}`,
    })),
    ...parts.map(part => ({
      id: part.id,
      type: 'part' as const,
      title: `${part.sku} - ${part.name}`,
      subtitle: 'Part',
      url: `/inventory?part=${part.id}`,
    })),
    ...vendors.map(vendor => ({
      id: vendor.id,
      type: 'vendor' as const,
      title: vendor.name,
      subtitle: 'Vendor',
      url: `/vendors/${vendor.id}`,
    })),
  ];

  return ok(res, results.slice(0, 10));
}));

export default router;