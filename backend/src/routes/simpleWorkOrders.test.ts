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
    prismaMock.workOrder.create.mockReset();
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
        code: 'VALIDATION_ERROR',
        fields: {
          assetId: ['Invalid assetId'],
        },
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
      assigneeId: null,
      assignee: null,
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
        assigneeId: 'BBBBBBBBBBBBBBBBBBBBBBBB',
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
    const res = createResponse();

    prismaMock.workOrder.create.mockResolvedValue({
      id: 'order-1',
      tenantId: 'tenant-1',
      siteId: 'site-1',
      title: 'Broken conveyor',
      description: 'Inspect the conveyor for issues',
      priority: 'high',
      status: 'requested',
      assetId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      createdBy: 'user-1',
      assigneeId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      dueDate: new Date(now.toISOString()),
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
      createdAt: now,
      updatedAt: now,
    });

    await createWorkOrder(req, res);

    expect(prismaMock.workOrder.create).toHaveBeenCalledTimes(1);
    const createArgs = prismaMock.workOrder.create.mock.calls[0][0];

    expect(createArgs.data).toMatchObject({
      tenantId: 'tenant-1',
      siteId: 'site-1',
      title: 'Broken conveyor',
      description: 'Inspect the conveyor for issues',
      priority: 'high',
      status: 'requested',
      assetId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      createdBy: 'user-1',
      assigneeId: 'bbbbbbbbbbbbbbbbbbbbbbbb'.toLowerCase(),
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
    });

    expect(createArgs.data.dueDate).toBeInstanceOf(Date);
    expect(createArgs.data.dueDate?.toISOString()).toBe(now.toISOString());

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
        assigneeId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
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
