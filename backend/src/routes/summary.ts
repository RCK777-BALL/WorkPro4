import { Router } from 'express';
import { ok, asyncHandler } from '../utils/response';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { DashboardSummaryResponse } from '../../../shared/types/dashboard';
import { prisma } from '../db';

const router = Router();

router.use(authenticateToken);
router.use(tenantScope);

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const endOfPreviousMonth = startOfMonth;

  // Get work order stats
  const [
    openWOs,
    overdueWOs,
    completedThisMonth,
    completedLastMonth,
    totalAssets,
    assetsDown,
    totalParts,
    lowStockParts,
  ] = await Promise.all([
    prisma.workOrder.count({
      where: {
        tenantId,
        status: { in: ['requested', 'assigned', 'in_progress'] },
      },
    }),
    prisma.workOrder.count({
      where: {
        tenantId,
        status: { in: ['requested', 'assigned', 'in_progress'] },
        createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.workOrder.count({
      where: {
        tenantId,
        status: 'completed',
        updatedAt: {
          gte: startOfMonth,
        },
      },
    }),
    prisma.workOrder.count({
      where: {
        tenantId,
        status: 'completed',
        updatedAt: {
          gte: startOfPreviousMonth,
          lt: endOfPreviousMonth,
        },
      },
    }),
    prisma.asset.count({ where: { tenantId } }),
    prisma.asset.count({ where: { tenantId, status: 'down' } }),
    prisma.part.count({ where: { tenantId } }),
    prisma.part.findMany({
      where: { tenantId },
      select: { onHand: true, min: true },
    }).then(parts => parts.filter(part => part.onHand < part.min).length),
  ]);

  const operationalAssets = totalAssets - assetsDown;
  const assetUptime = totalAssets > 0 ? (operationalAssets / totalAssets) * 100 : 100;
  const stockHealth = totalParts > 0 ? ((totalParts - lowStockParts) / totalParts) * 100 : 100;
  const completedTrendRaw = completedLastMonth === 0
    ? (completedThisMonth > 0 ? 100 : 0)
    : ((completedThisMonth - completedLastMonth) / completedLastMonth) * 100;
  const completedTrend = Math.round(completedTrendRaw * 10) / 10;

  const summary: DashboardSummaryResponse = {
    workOrders: {
      open: openWOs,
      overdue: overdueWOs,
      completedThisMonth,
      completedTrend,
    },
    assets: {
      uptime: Math.round(assetUptime * 10) / 10,
      total: totalAssets,
      down: assetsDown,
      operational: operationalAssets,
    },
    inventory: {
      totalParts,
      lowStock: lowStockParts,
      stockHealth: Math.round(stockHealth * 10) / 10,
    },
  };

  return ok(res, summary);
}));

router.get('/trends', asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Generate 30 days of trend data
  const trends = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

    const [created, completed] = await Promise.all([
      prisma.workOrder.count({
        where: {
          tenantId,
          createdAt: { gte: date, lt: nextDate },
        },
      }),
      prisma.workOrder.count({
        where: {
          tenantId,
          status: 'completed',
          updatedAt: { gte: date, lt: nextDate },
        },
      }),
    ]);

    trends.push({
      date: date.toISOString(),
      workOrdersCreated: created,
      workOrdersCompleted: completed,
      pmCompliance: 95 + Math.random() * 10, // Mock data
      assetUptime: 95 + Math.random() * 5,
    });
  }

  return ok(res, trends);
}));

router.get('/activity', asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const limit = parseInt(req.query.limit as string) || 10;

  const activities = await prisma.auditLog.findMany({
    where: { tenantId },
    include: {
      user: {
        select: { name: true },
      },
    },
    orderBy: { ts: 'desc' },
    take: limit,
  });

  return ok(res, activities.map(activity => ({
    id: activity.id,
    userName: activity.user?.name || 'System',
    action: activity.action,
    entityType: activity.entityType,
    entityId: activity.entityId,
    createdAt: activity.ts.toISOString(),
  })));
}));

export default router;