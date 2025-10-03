import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import dashboardRouter, { __testables } from '../dashboard';

type PrismaMock = {
  workOrder: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  downtimeLog: {
    findMany: ReturnType<typeof vi.fn>;
  };
  part: {
    findMany: ReturnType<typeof vi.fn>;
  };
  asset: {
    count: ReturnType<typeof vi.fn>;
  };
};

const prismaMock = vi.hoisted(() => ({
  workOrder: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  downtimeLog: {
    findMany: vi.fn(),
  },
  part: {
    findMany: vi.fn(),
  },
  asset: {
    count: vi.fn(),
  },
})) as PrismaMock;

vi.mock('../../db', () => ({
  prisma: prismaMock,
}));

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (_req: any, _res: any, next: () => void) => {
    _req.user = {
      id: 'user-123',
      email: 'tech@example.com',
      name: 'Tech User',
      role: 'technician',
      tenantId: 'tenant-1',
    };
    next();
  },
}));

describe('dashboard route', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-01T12:00:00.000Z'));
    prismaMock.workOrder.findMany.mockReset();
    prismaMock.workOrder.count.mockReset();
    prismaMock.downtimeLog.findMany.mockReset();
    prismaMock.part.findMany.mockReset();
    prismaMock.asset.count.mockReset();
  });

  it('computes kpis and charts with scoped data', async () => {
    prismaMock.workOrder.findMany
      .mockResolvedValueOnce([
        { priority: 'high', createdAt: new Date('2024-04-27T00:00:00Z') },
        { priority: 'medium', createdAt: new Date('2024-04-20T00:00:00Z') },
        { priority: 'low', createdAt: new Date('2024-04-10T00:00:00Z') },
      ]) // open work orders
      .mockResolvedValueOnce([
        {
          startedAt: new Date('2024-04-22T10:00:00Z'),
          completedAt: new Date('2024-04-22T16:00:00Z'),
          timeSpentMin: null,
        },
        {
          startedAt: new Date('2024-04-25T12:00:00Z'),
          completedAt: new Date('2024-04-25T14:00:00Z'),
          timeSpentMin: 120,
        },
      ]) // mttr current
      .mockResolvedValueOnce([
        {
          startedAt: new Date('2024-03-18T10:00:00Z'),
          completedAt: new Date('2024-03-18T11:00:00Z'),
          timeSpentMin: null,
        },
      ]) // mttr previous
      .mockResolvedValueOnce([
        { status: 'requested', priority: 'urgent' },
        { status: 'assigned', priority: 'medium' },
        { status: 'completed', priority: 'low' },
      ]) // work orders by status
      .mockResolvedValueOnce([
        { dueDate: new Date('2024-05-05T08:00:00Z') },
        { dueDate: new Date('2024-05-06T08:00:00Z') },
      ]); // upcoming pm

    prismaMock.asset.count.mockResolvedValueOnce(5);

    prismaMock.downtimeLog.findMany
      .mockResolvedValueOnce([
        { minutes: 60 },
        { minutes: 30 },
      ]) // current downtime
      .mockResolvedValueOnce([{ minutes: 120 }]) // previous downtime
      .mockResolvedValueOnce([
        {
          assetId: 'asset-1',
          minutes: 90,
          asset: { name: 'Compressor A' },
        },
      ]); // top downtime

    prismaMock.part.findMany.mockResolvedValueOnce([
      { id: 'part-1', name: 'Filter', onHand: 1, minLevel: 3 },
      { id: 'part-2', name: 'Bolt', onHand: 5, minLevel: 5 },
      { id: 'part-3', name: 'Oil', onHand: 10, minLevel: 4 },
    ]);

    const app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRouter);

    const response = await request(app).get('/api/dashboard/metrics');

    expect(response.status).toBe(200);
    expect(response.body.data.kpis.openWorkOrders.total).toBe(3);
    expect(response.body.data.kpis.openWorkOrders.byPriority).toEqual({
      critical: 0,
      high: 1,
      medium: 1,
      low: 1,
    });
    expect(response.body.data.kpis.mttrHours.value).toBeGreaterThan(0);
    expect(response.body.data.kpis.uptimePct.value).toBeGreaterThan(0);
    expect(response.body.data.charts.topDowntimeAssets).toHaveLength(1);
    expect(prismaMock.part.findMany).toHaveBeenCalled();
  });

  it('returns 400 when filters invalid', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRouter);

    const response = await request(app)
      .get('/api/dashboard/metrics')
      .query({ from: '2024-05-02T00:00:00.000Z', to: '2024-04-01T00:00:00.000Z' });

    expect(response.status).toBe(400);
    expect(response.body.error?.code).toBe(400);
  });
});

describe('dashboard math helpers', () => {
  const { percentageDelta, minutesBetween, clamp, asPriority, asStatus, getDateRange } = __testables;

  it('computes percentage delta safely', () => {
    expect(percentageDelta(10, 5)).toBe(100);
    expect(percentageDelta(0, 0)).toBe(0);
  });

  it('calculates minute differences', () => {
    expect(
      minutesBetween(new Date('2024-05-01T10:00:00Z'), new Date('2024-05-01T11:30:00Z')),
    ).toBe(90);
    expect(minutesBetween(null, new Date())).toBe(0);
  });

  it('clamps values within range', () => {
    expect(clamp(1.5, 0, 1)).toBe(1);
    expect(clamp(-0.2, 0, 1)).toBe(0);
  });

  it('normalizes priorities and statuses', () => {
    expect(asPriority('urgent')).toBe('critical');
    expect(asPriority('unknown' as any)).toBe('medium');
    expect(asStatus('assigned')).toBe('approved');
  });

  it('provides default date ranges', () => {
    const { from, to } = getDateRange({});
    expect(to.getTime()).toBeGreaterThan(from.getTime());
  });
});
