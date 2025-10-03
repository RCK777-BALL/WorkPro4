import { Router, type Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { asyncHandler, fail, ok } from '../utils/response';

const router = Router();

router.use(authenticateToken);

type TenantScopedWhere = {
  tenantId: string;
  siteId?: string | null;
};

type TenantScopeFilter = {
  tenantId: string;
  siteId?: string;
};

function buildTenantScope({ tenantId, siteId }: TenantScopedWhere): TenantScopeFilter {
  return siteId ? { tenantId, siteId } : { tenantId };
}

export async function getDashboardMetrics(req: AuthRequest, res: Response) {
  if (!req.user) {
    return fail(res, 401, 'Authentication required');
  }

  const scope = buildTenantScope({ tenantId: req.user.tenantId, siteId: req.user.siteId ?? null });
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [openWorkOrders, overdueWorkOrders, completedThisMonth, totalAssets, downAssets] = await Promise.all([
    prisma.workOrder.count({
      where: {
        ...scope,
        status: {
          in: ['requested', 'assigned', 'in_progress'],
        },
      },
    }),
    prisma.workOrder.count({
      where: {
        ...scope,
        status: {
          in: ['requested', 'assigned', 'in_progress'],
        },
        dueDate: {
          lt: now,
        },
      },
    }),
    prisma.workOrder.count({
      where: {
        ...scope,
        status: 'completed',
        updatedAt: {
          gte: startOfMonth,
        },
      },
    }),
    prisma.asset.count({
      where: {
        ...scope,
      },
    }),
    prisma.asset.count({
      where: {
        ...scope,
        status: {
          not: 'operational',
        },
      },
    }),
  ]);

  const operationalAssets = totalAssets - downAssets;
  const uptime = totalAssets > 0 ? Number(((operationalAssets / totalAssets) * 100).toFixed(1)) : 100;

  return ok(res, {
    workOrders: {
      open: openWorkOrders,
      overdue: overdueWorkOrders,
      completedThisMonth,
      completedTrend: 18,
    },
    assets: {
      uptime,
      total: totalAssets,
      down: downAssets,
      operational: operationalAssets,
    },
    inventory: {
      totalParts: 1284,
      lowStock: 7,
      stockHealth: 92.5,
    },
  });
}

router.get(
  '/metrics',
  asyncHandler(getDashboardMetrics),
);

router.get(
  '/trends',
  asyncHandler(async (_req, res) => {
    const trends = [
      { date: '2024-01-15', workOrdersCreated: 8, workOrdersCompleted: 6 },
      { date: '2024-01-16', workOrdersCreated: 11, workOrdersCompleted: 9 },
      { date: '2024-01-17', workOrdersCreated: 10, workOrdersCompleted: 12 },
      { date: '2024-01-18', workOrdersCreated: 9, workOrdersCompleted: 10 },
      { date: '2024-01-19', workOrdersCreated: 13, workOrdersCompleted: 11 },
      { date: '2024-01-20', workOrdersCreated: 12, workOrdersCompleted: 13 },
      { date: '2024-01-21', workOrdersCreated: 14, workOrdersCompleted: 15 },
      { date: '2024-01-22', workOrdersCreated: 15, workOrdersCompleted: 14 },
      { date: '2024-01-23', workOrdersCreated: 13, workOrdersCompleted: 12 },
      { date: '2024-01-24', workOrdersCreated: 12, workOrdersCompleted: 13 },
      { date: '2024-01-25', workOrdersCreated: 16, workOrdersCompleted: 15 },
      { date: '2024-01-26', workOrdersCreated: 14, workOrdersCompleted: 15 },
      { date: '2024-01-27', workOrdersCreated: 12, workOrdersCompleted: 13 },
      { date: '2024-01-28', workOrdersCreated: 11, workOrdersCompleted: 12 },
    ];

    return ok(res, trends);
  }),
);

router.get(
  '/activity',
  asyncHandler(async (_req, res) => {
    const activity = [
      {
        id: 'evt-1',
        action: 'completed a work order',
        userName: 'Jamie Rivera',
        entityType: 'work_order',
        entityId: 'wo-1001',
        entityName: 'Inspect HVAC filters',
        createdAt: new Date('2024-01-28T08:32:00Z').toISOString(),
      },
      {
        id: 'evt-2',
        action: 'updated asset status',
        userName: 'Taylor Chen',
        entityType: 'asset',
        entityId: 'asset-204',
        entityName: 'Packaging Conveyor Belt',
        createdAt: new Date('2024-01-28T07:50:00Z').toISOString(),
      },
      {
        id: 'evt-3',
        action: 'added a comment',
        userName: 'Morgan Lee',
        entityType: 'work_order',
        entityId: 'wo-1003',
        entityName: 'Replace hydraulic seals',
        createdAt: new Date('2024-01-28T07:18:00Z').toISOString(),
      },
      {
        id: 'evt-4',
        action: 'assigned a technician',
        userName: 'Alex Gomez',
        entityType: 'work_order',
        entityId: 'wo-1004',
        entityName: 'Calibrate pressure sensors',
        createdAt: new Date('2024-01-28T06:45:00Z').toISOString(),
      },
      {
        id: 'evt-5',
        action: 'logged new downtime',
        userName: 'Jordan Smith',
        entityType: 'asset',
        entityId: 'asset-209',
        entityName: 'Boiler Feed Pump',
        createdAt: new Date('2024-01-28T06:02:00Z').toISOString(),
      },
      {
        id: 'evt-6',
        action: 'restocked inventory',
        userName: 'Priya Patel',
        entityType: 'inventory',
        entityId: 'part-552',
        entityName: 'SKF Bearing Set',
        createdAt: new Date('2024-01-28T05:40:00Z').toISOString(),
      },
      {
        id: 'evt-7',
        action: 'created a work order',
        userName: 'Chris Johnson',
        entityType: 'work_order',
        entityId: 'wo-1005',
        entityName: 'Lubricate gear assembly',
        createdAt: new Date('2024-01-28T05:05:00Z').toISOString(),
      },
      {
        id: 'evt-8',
        action: 'uploaded inspection photos',
        userName: 'Robin Kim',
        entityType: 'work_order',
        entityId: 'wo-1006',
        entityName: 'Safety compliance audit',
        createdAt: new Date('2024-01-28T04:46:00Z').toISOString(),
      },
      {
        id: 'evt-9',
        action: 'closed a work order',
        userName: 'Avery Morgan',
        entityType: 'work_order',
        entityId: 'wo-1007',
        entityName: 'Replace coolant valves',
        createdAt: new Date('2024-01-28T04:20:00Z').toISOString(),
      },
      {
        id: 'evt-10',
        action: 'flagged low stock',
        userName: 'Dakota Nguyen',
        entityType: 'inventory',
        entityId: 'part-610',
        entityName: 'Hydraulic Hose Kit',
        createdAt: new Date('2024-01-28T03:55:00Z').toISOString(),
      },
    ];

    return ok(res, activity);
  }),
);

export default router;
