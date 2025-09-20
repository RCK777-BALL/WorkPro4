import { describe, it, expect, beforeEach, vi } from 'vitest';

const createMockPrisma = () => ({
  workOrder: { count: vi.fn() },
  asset: { count: vi.fn() },
  part: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  auditLog: { findMany: vi.fn() },
});

let mockPrisma = createMockPrisma();

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock('../../middleware/auth', () => ({
  authenticateToken: vi.fn((_req, _res, next) => next()),
  requireRoles: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

vi.mock('../../middleware/tenant', () => ({
  tenantScope: vi.fn((_req, _res, next) => next()),
}));

vi.mock('../../middleware/audit', () => ({
  auditLog: vi.fn(),
}));

type HttpMethod = 'get' | 'post' | 'put' | 'delete';

function getRouteHandler(router: any, method: HttpMethod, path: string) {
  for (const layer of router.stack) {
    if (layer.route && layer.route.path === path && layer.route.methods[method]) {
      return layer.route.stack[0].handle;
    }
  }
  throw new Error(`Route handler not found for [${method.toUpperCase()}] ${path}`);
}

describe('inventory-related routes', () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
    vi.resetModules();
  });

  it('computes low stock parts without relying on prisma field refs', async () => {
    const { default: summaryRouter } = await import('../summary');

    mockPrisma.workOrder.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    mockPrisma.asset.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2);

    mockPrisma.part.count.mockResolvedValueOnce(6);

    mockPrisma.part.findMany.mockResolvedValueOnce([
      { onHand: 1, min: 2 },
      { onHand: 5, min: 5 },
      { onHand: 0, min: 1 },
    ]);

    const handler = getRouteHandler(summaryRouter, 'get', '/');

    const json = vi.fn().mockImplementation((value) => value);
    const res = { json, status: vi.fn().mockReturnThis() };
    const req = { user: { tenantId: 'tenant-1' } };
    const next = vi.fn();

    await handler(req as any, res as any, next);
    await new Promise(resolve => setImmediate(resolve));

    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalled();

    expect(mockPrisma.part.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      select: { onHand: true, min: true },
    });

    const response = json.mock.calls[0][0];
    expect(response.data.inventory.totalParts).toBe(6);
    expect(response.data.inventory.stockHealth).toBeCloseTo(66.7, 1);
  });

  it('filters parts below minimum stock level when requested', async () => {
    const { default: partsRouter } = await import('../parts');

    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-01-02T00:00:00.000Z');

    mockPrisma.part.findMany.mockResolvedValueOnce([
      {
        id: 'part-1',
        tenantId: 'tenant-1',
        sku: 'SKU-1',
        name: 'Part 1',
        min: 5,
        max: 10,
        onHand: 3,
        cost: { toString: () => '12.34' },
        vendorId: null,
        vendor: null,
        createdAt,
        updatedAt,
      },
      {
        id: 'part-2',
        tenantId: 'tenant-1',
        sku: 'SKU-2',
        name: 'Part 2',
        min: 2,
        max: 8,
        onHand: 4,
        cost: { toString: () => '7.89' },
        vendorId: null,
        vendor: null,
        createdAt,
        updatedAt,
      },
    ]);

    const handler = getRouteHandler(partsRouter, 'get', '/');

    const json = vi.fn().mockImplementation((value) => value);
    const res = { json, status: vi.fn().mockReturnThis() };
    const req = {
      user: { tenantId: 'tenant-1' },
      query: { belowMin: '1' },
    };
    const next = vi.fn();

    await handler(req as any, res as any, next);
    await new Promise(resolve => setImmediate(resolve));

    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalled();

    expect(mockPrisma.part.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      include: {
        vendor: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const response = json.mock.calls[0][0];
    expect(response.data).toHaveLength(1);
    expect(response.data[0]).toMatchObject({ id: 'part-1', onHand: 3, min: 5 });
  });
});
