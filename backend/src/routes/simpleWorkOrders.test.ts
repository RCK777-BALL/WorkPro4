import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorkOrder } from '../controllers/workOrderController';

const prismaMock = vi.hoisted(() => ({
  workOrder: {
    create: vi.fn(),
  },
})) as {
  workOrder: { create: ReturnType<typeof vi.fn> };
};

vi.mock('../lib/ids', () => ({
  normalizeToObjectIdString(value: unknown) {
    if (typeof value !== 'string') {
      throw new TypeError('Invalid ObjectId');
    }

    const trimmed = value.trim();

    if (trimmed.length !== 24) {
      throw new TypeError('Invalid ObjectId');
    }

    return trimmed.toLowerCase();
  },
}));

vi.mock('../db', () => ({
  prisma: prismaMock,
}));

function createResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  return res;
}

describe('workOrderController.createWorkOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns validation error when assetId is invalid', async () => {
    const req = {
      body: {
        title: 'Broken conveyor',
        assetId: 'not-an-object-id',
      },
      tenantId: 'tenant-1',
      userId: 'user-1',
    } as unknown as Request & { tenantId: string; userId: string };

    const res = createResponse();

    await createWorkOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: 400,
        message: 'Value must be a valid ObjectId string',
        details: undefined,

      },
    });
    expect(prismaMock.workOrder.create).not.toHaveBeenCalled();
  });

  it('creates a work order with sanitized fields', async () => {
    const now = new Date();

    prismaMock.workOrder.create.mockResolvedValue({
      id: 'order-1',
      tenantId: 'tenant-1',
      siteId: 'site-1',
      title: 'Broken conveyor',
      description: 'Inspect the conveyor for issues',
      priority: 'high',
      status: 'requested',
      assetId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      asset: null,
      assignedTo: null,
      assignedToUser: null,
      category: null,
      attachments: [],
      dueDate: null,
      createdByUser: { id: 'user-1', name: 'Requester' },
      createdAt: now,
      updatedAt: now,
      timeSpentMin: null,

    });

    const req = {
      body: {
        title: 'Broken conveyor',
        description: 'Inspect the conveyor for issues',
        priority: 'high',
        assetId: 'AAAAAAAAAAAAAAAAAAAAAAAA',
        assignedTo: 'BBBBBBBBBBBBBBBBBBBBBBBB',
        dueDate: now.toISOString(),
        category: 'maintenance',
        attachments: [
          {
            id: 'CCCCCCCCCCCCCCCCCCCCCCCC',
            url: 'https://example.com/report.pdf',
            filename: 'report.pdf',
            contentType: 'application/pdf',
            size: 1234,
          },
        ],
      },
      tenantId: 'tenant-1',
      siteId: 'site-1',
      userId: 'user-1',
    } as unknown as Request & { tenantId: string; siteId: string; userId: string };

    expect(prismaMock.user.findFirst).toHaveBeenCalledTimes(1);
    expect(prismaMock.workOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assetId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
          attachments: [],
          assignedTo: null,
          category: undefined,
          dueDate: undefined,
          priority: 'medium',
          status: 'requested',
        }),
      }),
    );


    await createWorkOrder(req, res);

    expect(prismaMock.workOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        siteId: 'site-1',
        title: 'Broken conveyor',
        description: 'Inspect the conveyor for issues',
        priority: 'high',
        status: 'requested',
        assetId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        attachments: [],
        assignedTo: null,
        category: null,
        dueDate: null,

      }),
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      workOrder: {
        id: 'order-1',
        tenantId: 'tenant-1',
        siteId: 'site-1',
        title: 'Broken conveyor',
        description: 'Inspect the conveyor for issues',
        priority: 'high',
        status: 'requested',
        assetId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        requestedBy: 'user-1',
        assignedTo: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        dueDate: now.toISOString(),
        category: 'maintenance',
        attachments: [
          {
            id: 'cccccccccccccccccccccccc',
            url: 'https://example.com/report.pdf',
            filename: 'report.pdf',
            contentType: 'application/pdf',
            size: 1234,
          },
        ],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    });
  });
});
