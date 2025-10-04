import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auditLog, AUDIT_RETENTION_DAYS } from './audit';
import type { AuthRequest } from './auth';

const prismaMock = vi.hoisted(() => ({
  auditEvent: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
})) as {
  auditEvent: {
    create: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

vi.mock('../db', () => ({
  prisma: prismaMock,
}));

type FinishRunner = { runFinish: () => Promise<void> };

function createResponse(statusCode: number): { res: Response; runner: FinishRunner } {
  let finishHandler: (() => Promise<void> | void) | undefined;
  const res = {
    statusCode,
    locals: {} as Response['locals'],
    on: vi.fn((event: string, handler: () => Promise<void> | void) => {
      if (event === 'finish') {
        finishHandler = handler;
      }
      return res;
    }),
  } as unknown as Response;

  return {
    res,
    runner: {
      async runFinish() {
        await finishHandler?.();
        await Promise.resolve();
      },
    },
  };
}

describe('auditLog middleware', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    prismaMock.auditEvent.create.mockReset();
    prismaMock.auditEvent.deleteMany.mockReset();
    prismaMock.auditEvent.create.mockResolvedValue({ id: 'audit-1' });
    prismaMock.auditEvent.deleteMany.mockResolvedValue({ count: 0 });
  });

  it.each([
    ['create', 'POST', 201],
    ['update', 'PUT', 200],
    ['delete', 'DELETE', 204],
  ])('records %s events on success', async (action, method, statusCode) => {
    const middleware = auditLog(action, 'work_order');
    const { res, runner } = createResponse(statusCode);
    const req = {
      method,
      originalUrl: '/api/work-orders/123',
      headers: { 'x-request-id': 'req-123' },
      user: {
        id: 'user-1',
        tenantId: 'tenant-1',
        role: 'manager',
        email: 'manager@example.com',
        name: 'Manager',
      },
    } as unknown as AuthRequest;

    const next = vi.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();

    res.locals.auditMetadata = {
      workOrderId: 'wo-123',
      ownerEmail: 'owner@example.com',
    };

    await runner.runFinish();

    expect(prismaMock.auditEvent.create).toHaveBeenCalledTimes(1);
    const payload = prismaMock.auditEvent.create.mock.calls[0][0].data as Record<string, any>;
    expect(payload.action).toBe(action);
    expect(payload.resource).toBe('work_order');
    expect(payload.tenantId).toBe('tenant-1');
    expect(payload.userId).toBe('user-1');
    expect(payload.userRole).toBe('manager');
    expect(payload.context).toMatchObject({
      method,
      path: '/api/work-orders/123',
      statusCode,
      requestId: 'req-123',
    });

    const metadata = (payload.context as Record<string, any>).metadata;
    expect(metadata).toMatchObject({
      workOrderId: 'wo-123',
      ownerEmail: '[REDACTED]',
    });

    expect(prismaMock.auditEvent.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('uses tenant context when user information is missing', async () => {
    const middleware = auditLog('create', 'asset');
    const { res, runner } = createResponse(201);
    const req = {
      method: 'POST',
      originalUrl: '/api/assets',
      headers: {},
      tenantId: 'tenant-42',
    } as unknown as AuthRequest;

    const next = vi.fn();
    middleware(req, res, next);

    res.locals.auditMetadata = { assetId: 'asset-9' };
    await runner.runFinish();

    expect(prismaMock.auditEvent.create).toHaveBeenCalledTimes(1);
    const payload = prismaMock.auditEvent.create.mock.calls[0][0].data as Record<string, any>;
    expect(payload.tenantId).toBe('tenant-42');
    expect(payload.userId).toBeNull();
  });

  it('does not create audit events for error responses', async () => {
    const middleware = auditLog('update', 'asset');
    const { res, runner } = createResponse(422);
    const req = {
      method: 'PATCH',
      originalUrl: '/api/assets/asset-1',
      headers: {},
      user: {
        id: 'user-1',
        tenantId: 'tenant-1',
        role: 'manager',
      },
    } as unknown as AuthRequest;

    const next = vi.fn();
    middleware(req, res, next);

    res.locals.auditMetadata = { assetId: 'asset-1' };
    await runner.runFinish();

    expect(prismaMock.auditEvent.create).not.toHaveBeenCalled();
    expect(prismaMock.auditEvent.deleteMany).not.toHaveBeenCalled();
  });

  it('applies retention policy when recording events', async () => {
    vi.useFakeTimers();
    const fixedDate = new Date('2024-01-01T00:00:00.000Z');
    vi.setSystemTime(fixedDate);

    const middleware = auditLog('delete', 'work_order');
    const { res, runner } = createResponse(200);
    const req = {
      method: 'DELETE',
      originalUrl: '/api/work-orders/wo-9',
      headers: {},
      user: {
        id: 'user-2',
        tenantId: 'tenant-55',
        role: 'admin',
      },
    } as unknown as AuthRequest;

    const next = vi.fn();
    middleware(req, res, next);

    res.locals.auditMetadata = { workOrderId: 'wo-9' };
    await runner.runFinish();

    const cutoff = new Date(fixedDate.getTime() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    expect(prismaMock.auditEvent.deleteMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-55',
        occurredAt: { lt: cutoff },
      },
    });

    vi.useRealTimers();
  });
});
