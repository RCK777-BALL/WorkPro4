import type { Response } from 'express';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthRequest } from '../../middleware/auth';

vi.mock('express', () => ({
  Router: () => ({ use: vi.fn(), get: vi.fn() }),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    $connect = vi.fn();
    $disconnect = vi.fn();
  },
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code?: string;
    },
  },
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(),
  verify: vi.fn(),
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  workOrder: {
    count: vi.fn(),
  },
  asset: {
    count: vi.fn(),
  },
})) as {
  workOrder: { count: ReturnType<typeof vi.fn> };
  asset: { count: ReturnType<typeof vi.fn> };
};

vi.mock('../../db', () => ({
  prisma: prismaMock,
}));

let getDashboardMetrics: (typeof import('../dashboard'))['getDashboardMetrics'];

beforeAll(async () => {
  ({ getDashboardMetrics } = await import('../dashboard'));
});

function createRequest(overrides: Partial<NonNullable<AuthRequest['user']>> = {}): AuthRequest {
  return {
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Example User',
      role: 'user',
      tenantId: 'tenant-a',
      siteId: 'site-1',
      ...overrides,
    },
  } as AuthRequest;
}

function createResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };

  return res;
}

describe('dashboard metrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-04-15T10:30:00.000Z'));
    prismaMock.workOrder.count.mockReset();
    prismaMock.asset.count.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies tenant and site scoping to work order and asset counts', async () => {
    prismaMock.workOrder.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(7);
    prismaMock.asset.count.mockResolvedValueOnce(12).mockResolvedValueOnce(3);

    const req = createRequest();
    const res = createResponse();

    await getDashboardMetrics(req, res);

    expect(prismaMock.workOrder.count).toHaveBeenNthCalledWith(1, {
      where: {
        tenantId: 'tenant-a',
        siteId: 'site-1',
        status: {
          in: ['requested', 'assigned', 'in_progress'],
        },
      },
    });
    expect(prismaMock.workOrder.count).toHaveBeenNthCalledWith(2, {
      where: {
        tenantId: 'tenant-a',
        siteId: 'site-1',
        status: {
          in: ['requested', 'assigned', 'in_progress'],
        },
        dueDate: {
          lt: new Date('2024-04-15T10:30:00.000Z'),
        },
      },
    });
    expect(prismaMock.workOrder.count).toHaveBeenNthCalledWith(3, {
      where: {
        tenantId: 'tenant-a',
        siteId: 'site-1',
        status: 'completed',
        updatedAt: {
          gte: new Date('2024-04-01T00:00:00.000Z'),
        },
      },
    });
    expect(prismaMock.asset.count).toHaveBeenNthCalledWith(1, {
      where: {
        tenantId: 'tenant-a',
        siteId: 'site-1',
      },
    });
    expect(prismaMock.asset.count).toHaveBeenNthCalledWith(2, {
      where: {
        tenantId: 'tenant-a',
        siteId: 'site-1',
        status: {
          not: 'operational',
        },
      },
    });

    expect(res.json).toHaveBeenCalledWith({
      data: {
        workOrders: {
          open: 5,
          overdue: 2,
          completedThisMonth: 7,
          completedTrend: 18,
        },
        assets: {
          uptime: 75,
          total: 12,
          down: 3,
          operational: 9,
        },
        inventory: {
          totalParts: 1284,
          lowStock: 7,
          stockHealth: 92.5,
        },
      },
      error: null,
    });
  });

  it('isolates metrics results per tenant', async () => {
    prismaMock.workOrder.count.mockImplementation(async ({ where }) => {
      const tenantId = where?.tenantId;

      if (tenantId === 'tenant-a') {
        if (typeof where?.status === 'string') {
          return 3;
        }

        if (where?.dueDate) {
          return 1;
        }

        return 5;
      }

      if (tenantId === 'tenant-b') {
        if (typeof where?.status === 'string') {
          return 6;
        }

        if (where?.dueDate) {
          return 2;
        }

        return 8;
      }

      throw new Error(`Unexpected tenantId: ${tenantId ?? 'none'}`);
    });

    prismaMock.asset.count.mockImplementation(async ({ where }) => {
      const tenantId = where?.tenantId;

      if (tenantId === 'tenant-a') {
        return where?.status ? 1 : 9;
      }

      if (tenantId === 'tenant-b') {
        return where?.status ? 4 : 15;
      }

      throw new Error(`Unexpected tenantId: ${tenantId ?? 'none'}`);
    });

    const tenantAResponse = createResponse();
    await getDashboardMetrics(createRequest(), tenantAResponse);
    const tenantAData = tenantAResponse.json.mock.calls[0][0];

    expect(tenantAData.data.workOrders).toEqual({
      open: 5,
      overdue: 1,
      completedThisMonth: 3,
      completedTrend: 18,
    });
    expect(tenantAData.data.assets).toMatchObject({
      total: 9,
      down: 1,
      operational: 8,
    });

    const tenantBResponse = createResponse();
    await getDashboardMetrics(
      createRequest({
        id: 'user-2',
        email: 'other@example.com',
        name: 'Other User',
        tenantId: 'tenant-b',
        siteId: undefined,
      }),
      tenantBResponse,
    );
    const tenantBData = tenantBResponse.json.mock.calls[0][0];

    expect(tenantBData.data.workOrders).toEqual({
      open: 8,
      overdue: 2,
      completedThisMonth: 6,
      completedTrend: 18,
    });
    expect(tenantBData.data.assets).toMatchObject({
      total: 15,
      down: 4,
      operational: 11,
    });

    const tenantIdsFromWorkOrderCalls = prismaMock.workOrder.count.mock.calls.map((call) => call[0]?.where?.tenantId);
    expect(tenantIdsFromWorkOrderCalls).toEqual([
      'tenant-a',
      'tenant-a',
      'tenant-a',
      'tenant-b',
      'tenant-b',
      'tenant-b',
    ]);

    const tenantIdsFromAssetCalls = prismaMock.asset.count.mock.calls.map((call) => call[0]?.where?.tenantId);
    expect(tenantIdsFromAssetCalls).toEqual(['tenant-a', 'tenant-a', 'tenant-b', 'tenant-b']);
    expect(prismaMock.workOrder.count.mock.calls[3][0]?.where?.siteId).toBeUndefined();
  });
});
