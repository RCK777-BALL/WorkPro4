import { Router, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { asyncHandler, fail, ok } from '../utils/response';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const querySchema = z
  .object({
    siteId: z
      .string()
      .trim()
      .regex(OBJECT_ID_REGEX, 'siteId must be a valid object id')
      .optional(),
    lineId: z
      .string()
      .trim()
      .regex(OBJECT_ID_REGEX, 'lineId must be a valid object id')
      .optional(),
    assetId: z
      .string()
      .trim()
      .regex(OBJECT_ID_REGEX, 'assetId must be a valid object id')
      .optional(),
    from: z
      .string()
      .datetime({ offset: true })
      .optional(),
    to: z
      .string()
      .datetime({ offset: true })
      .optional(),
    rolePreset: z.enum(['admin', 'manager', 'planner', 'technician']).optional(),
  })
  .refine((value) => {
    if (!value.from || !value.to) {
      return true;
    }

    return new Date(value.from).getTime() <= new Date(value.to).getTime();
  }, 'from date must be before to date');

type DashboardFilters = z.infer<typeof querySchema>;

type TenantScopedFilters = Omit<DashboardFilters, 'from' | 'to'> & {
  tenantId: string;
  userId: string;
  from?: Date;
  to?: Date;
};

type PriorityBuckets = Record<'critical' | 'high' | 'medium' | 'low', number>;

type StatusBuckets = Record<'requested' | 'approved' | 'in_progress' | 'completed' | 'cancelled', number>;

const OPEN_STATUSES: Array<'requested' | 'approved' | 'in_progress'> = [
  'requested',
  'approved',
  'in_progress',
];

const STATUS_MAP: Record<string, keyof StatusBuckets> = {
  requested: 'requested',
  approved: 'approved',
  assigned: 'approved',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
};

const PRIORITY_MAP: Record<string, keyof PriorityBuckets> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  urgent: 'critical',
};

function asPriority(value: string | null | undefined): keyof PriorityBuckets {
  if (!value) {
    return 'medium';
  }

  return PRIORITY_MAP[value] ?? 'medium';
}

function asStatus(value: string | null | undefined): keyof StatusBuckets {
  if (!value) {
    return 'requested';
  }

  return STATUS_MAP[value] ?? 'requested';
}

function createPriorityBuckets(): PriorityBuckets {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function percentageDelta(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function minutesBetween(start?: Date | null, end?: Date | null): number {
  if (!start || !end) {
    return 0;
  }

  const diff = end.getTime() - start.getTime();
  return diff > 0 ? Math.round(diff / 60000) : 0;
}

function getDateRange(filters: DashboardFilters): { from: Date; to: Date } {
  const to = filters.to ? new Date(filters.to) : new Date();
  const from = filters.from ? new Date(filters.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  return { from, to };
}

function normalizeNumber(value: number | null | undefined, precision = 1) {
  if (!value || Number.isNaN(value)) {
    return 0;
  }

  return Number(value.toFixed(precision));
}

async function loadOpenWorkOrders(scope: TenantScopeWithRange) {
  const where = buildWorkOrderWhere(scope, { status: { in: OPEN_STATUSES } });
  const openOrders = await prisma.workOrder.findMany({
    where,
    select: {
      priority: true,
      createdAt: true,
    },
  });

  const priorityBuckets = createPriorityBuckets();
  const now = new Date(scope.to ?? new Date());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevStart = new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000);

  let currentWindow = 0;
  let previousWindow = 0;

  for (const order of openOrders) {
    priorityBuckets[asPriority(order.priority)] += 1;

    if (order.createdAt && order.createdAt >= sevenDaysAgo) {
      currentWindow += 1;
    } else if (order.createdAt && order.createdAt >= prevStart && order.createdAt < sevenDaysAgo) {
      previousWindow += 1;
    }
  }

  return {
    total: openOrders.length,
    byPriority: priorityBuckets,
    delta7d: percentageDelta(currentWindow, previousWindow),
  };
}

async function loadMttr(scope: TenantScopeWithRange) {
  const where = buildWorkOrderWhere(scope, {
    status: 'completed',
    completedAt: {
      gte: scope.from,
      lte: scope.to,
    },
  });

  const completed = await prisma.workOrder.findMany({
    where,
    select: {
      startedAt: true,
      completedAt: true,
      timeSpentMin: true,
    },
  });

  if (!completed.length) {
    return { value: 0, delta30d: 0 };
  }

  let totalMinutes = 0;
  let previousMinutes = 0;
  let previousCount = 0;

  const previousFrom = new Date(scope.from.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousTo = new Date(scope.from.getTime());

  for (const order of completed) {
    const minutes = order.timeSpentMin ?? minutesBetween(order.startedAt, order.completedAt);
    totalMinutes += minutes;
  }

  const previousWhere = buildWorkOrderWhere(scope, {
    status: 'completed',
    completedAt: {
      gte: previousFrom,
      lt: previousTo,
    },
  });

  const previousCompleted = await prisma.workOrder.findMany({
    where: previousWhere,
    select: {
      startedAt: true,
      completedAt: true,
      timeSpentMin: true,
    },
  });

  for (const order of previousCompleted) {
    const minutes = order.timeSpentMin ?? minutesBetween(order.startedAt, order.completedAt);
    previousMinutes += minutes;
    previousCount += 1;
  }

  const currentAvg = totalMinutes / completed.length;
  const previousAvg = previousCount ? previousMinutes / previousCount : 0;

  return {
    value: normalizeNumber(currentAvg / 60, 2),
    delta30d: percentageDelta(currentAvg, previousAvg),
  };
}

async function loadUptime(scope: TenantScopeWithRange) {
  const assetWhere = buildAssetWhere(scope);
  const assetCount = await prisma.asset.count({ where: assetWhere });

  if (assetCount === 0) {
    return { value: 100, delta30d: 0 };
  }

  const downtimeLogs = await prisma.downtimeLog.findMany({
    where: {
      tenantId: scope.tenantId,
      startedAt: {
        gte: scope.from,
        lte: scope.to,
      },
      ...(scope.siteId ? { siteId: scope.siteId } : {}),
      ...(scope.lineId ? { lineId: scope.lineId } : {}),
      ...(scope.assetId ? { assetId: scope.assetId } : {}),
    },
    select: {
      minutes: true,
    },
  });

  const totalDowntimeMinutes = downtimeLogs.reduce((sum, log) => sum + (log.minutes ?? 0), 0);
  const windowMinutes = Math.max(1, Math.round((scope.to.getTime() - scope.from.getTime()) / 60000));
  const uptimeRatio = clamp(1 - totalDowntimeMinutes / (assetCount * windowMinutes));

  const previousLogs = await prisma.downtimeLog.findMany({
    where: {
      tenantId: scope.tenantId,
      startedAt: {
        gte: new Date(scope.from.getTime() - (scope.to.getTime() - scope.from.getTime())),
        lt: scope.from,
      },
      ...(scope.siteId ? { siteId: scope.siteId } : {}),
      ...(scope.lineId ? { lineId: scope.lineId } : {}),
      ...(scope.assetId ? { assetId: scope.assetId } : {}),
    },
    select: {
      minutes: true,
    },
  });

  const previousDowntime = previousLogs.reduce((sum, log) => sum + (log.minutes ?? 0), 0);
  const previousUptime = clamp(1 - previousDowntime / (assetCount * windowMinutes));

  return {
    value: normalizeNumber(uptimeRatio * 100, 1),
    delta30d: percentageDelta(uptimeRatio, previousUptime),
  };
}

async function loadStockout(scope: TenantScopedFilters) {
  const parts = await prisma.part.findMany({
    where: {
      tenantId: scope.tenantId,
    },
    include: {
      stockLevels: true,
    },
  });

  const items = parts
    .map((part) => {
      const onHand = part.stockLevels.reduce((sum, level) => sum + level.onHand, 0);
      return {
        partId: part.id,
        name: part.name,
        onHand,
        min: part.defaultMinLevel,
      };
    })
    .filter((part) => part.onHand <= part.min);

  return {
    count: items.length,
    items,
  };
}

async function loadWorkOrdersByStatus(scope: TenantScopeWithRange) {
  const technicianScoped = scope.rolePreset === 'technician';
  const where = buildWorkOrderWhere(scope, {
    ...(technicianScoped ? { assigneeId: scope.userId } : {}),
    createdAt: {
      gte: scope.from,
      lte: scope.to,
    },
  });

  const orders = await prisma.workOrder.findMany({
    where,
    select: {
      status: true,
      priority: true,
    },
  });

  const buckets: Record<keyof StatusBuckets, PriorityBuckets> = {
    requested: createPriorityBuckets(),
    approved: createPriorityBuckets(),
    in_progress: createPriorityBuckets(),
    completed: createPriorityBuckets(),
    cancelled: createPriorityBuckets(),
  };

  for (const order of orders) {
    const status = asStatus(order.status);
    buckets[status][asPriority(order.priority)] += 1;
  }

  return Object.entries(buckets).map(([status, priorities]) => ({
    status,
    ...priorities,
  }));
}

async function loadTopDowntime(scope: TenantScopeWithRange) {
  const logs = await prisma.downtimeLog.findMany({
    where: {
      tenantId: scope.tenantId,
      startedAt: {
        gte: scope.from,
        lte: scope.to,
      },
      ...(scope.siteId ? { siteId: scope.siteId } : {}),
      ...(scope.lineId ? { lineId: scope.lineId } : {}),
      ...(scope.assetId ? { assetId: scope.assetId } : {}),
    },
    select: {
      assetId: true,
      minutes: true,
      asset: {
        select: {
          name: true,
        },
      },
    },
  });

  const totals = new Map<string, { name: string; downtimeMinutes: number }>();

  for (const log of logs) {
    const entry = totals.get(log.assetId) ?? {
      name: log.asset?.name ?? 'Unknown Asset',
      downtimeMinutes: 0,
    };

    entry.downtimeMinutes += log.minutes ?? 0;
    totals.set(log.assetId, entry);
  }

  return Array.from(totals.entries())
    .map(([assetId, value]) => ({
      assetId,
      name: value.name,
      downtimeHours: normalizeNumber(value.downtimeMinutes / 60, 2),
    }))
    .sort((a, b) => b.downtimeHours - a.downtimeHours)
    .slice(0, 10);
}

async function loadUpcomingPm(scope: TenantScopedFilters) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const technicianScoped = scope.rolePreset === 'technician';

  const where = buildWorkOrderWhere(scope, {
    isPreventive: true,
    dueDate: {
      gte: now,
      lte: horizon,
    },
    ...(technicianScoped ? { assigneeId: scope.userId } : {}),
  });

  const upcoming = await prisma.workOrder.findMany({
    where,
    select: {
      dueDate: true,
    },
  });

  const schedule = new Map<string, number>();

  for (const workOrder of upcoming) {
    if (!workOrder.dueDate) {
      continue;
    }

    const dateKey = workOrder.dueDate.toISOString().slice(0, 10);
    schedule.set(dateKey, (schedule.get(dateKey) ?? 0) + 1);
  }

  return Array.from(schedule.entries())
    .map(([date, count]) => ({
      date: new Date(date).toISOString(),
      count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildWorkOrderWhere(
  scope: TenantScopedFilters & Partial<{ from: Date; to: Date }>,
  extra: Record<string, unknown> = {},
) {
  return {
    tenantId: scope.tenantId,
    ...(scope.siteId ? { siteId: scope.siteId } : {}),
    ...(scope.lineId ? { lineId: scope.lineId } : {}),
    ...(scope.assetId ? { assetId: scope.assetId } : {}),
    ...extra,
  };
}

function buildAssetWhere(scope: TenantScopedFilters) {
  return {
    tenantId: scope.tenantId,
    ...(scope.siteId ? { siteId: scope.siteId } : {}),
    ...(scope.lineId ? { lineId: scope.lineId } : {}),
    ...(scope.assetId ? { id: scope.assetId } : {}),
  };
}

export const router = Router();

router.use(authenticateToken);

export async function getDashboardMetrics(req: AuthRequest, res: Response) {
  if (!req.user) {
    return fail(res, 401, 'Authentication required');
  }

  let filters: DashboardFilters;

  try {
    filters = querySchema.parse(req.query);
  } catch (error) {
    return fail(res, 400, 'Invalid filters', error instanceof Error ? error.message : error);
  }

  const { from, to } = getDateRange(filters);

  if (from.getTime() > to.getTime()) {
    return fail(res, 400, 'Invalid filters', 'from date must be before to date');
  }

  const rolePreset = filters.rolePreset ?? (req.user.role?.toLowerCase?.() as DashboardFilters['rolePreset']);

  const { from: _from, to: _to, ...restFilters } = filters;

  const scope: TenantScopedFilters & { from: Date; to: Date } = {
    ...restFilters,
    rolePreset,
    tenantId: req.user.tenantId,
    userId: req.user.id,
    from,
    to,
  };

  const [openWorkOrders, mttrHours, uptimePct, stockoutRisk, workOrdersByStatusPriority, topDowntimeAssets, upcomingPm] =
    await Promise.all([
      loadOpenWorkOrders(scope),
      loadMttr(scope),
      loadUptime(scope),
      loadStockout(scope),
      loadWorkOrdersByStatus(scope),
      loadTopDowntime(scope),
      loadUpcomingPm(scope),
    ]);

  const responsePayload = {
    kpis: {
      openWorkOrders,
      mttrHours,
      uptimePct,
      stockoutRisk: (rolePreset ?? filters.rolePreset) === 'technician'
        ? { count: stockoutRisk.count, items: [] }
        : stockoutRisk,
    },
    charts: {
      workOrdersByStatusPriority,
      topDowntimeAssets,
      upcomingPm,
    },
    context: {
      tenantId: req.user.tenantId,
      filters: {
        ...(filters.siteId ? { siteId: filters.siteId } : {}),
        ...(filters.lineId ? { lineId: filters.lineId } : {}),
        ...(filters.assetId ? { assetId: filters.assetId } : {}),
        from: scope.from.toISOString(),
        to: scope.to.toISOString(),
      },
    },
  } as const;

  return ok(res, responsePayload);
}

router.get(
  '/metrics',
  asyncHandler(getDashboardMetrics),
);

export const __testables = {
  percentageDelta,
  minutesBetween,
  clamp,
  getDateRange,
  asPriority,
  asStatus,
};

export default router;
