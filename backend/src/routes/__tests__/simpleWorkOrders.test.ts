import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface PrismaMock {
  workOrder: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
}

const prismaMock = vi.hoisted(() => ({
  workOrder: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
})) as PrismaMock;

vi.mock('../../db', () => ({
  prisma: prismaMock,
}));

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: () => void) => {
    const header = req.headers['x-test-user'];

    if (!header || typeof header !== 'string') {
      res.status(401).json({
        data: null,
        error: { code: 401, message: 'Access token required' },
      });
      return;
    }

    try {
      req.user = JSON.parse(header);
    } catch (error) {
      res.status(400).json({
        data: null,
        error: { code: 400, message: 'Invalid test user header' },
      });
      return;
    }

    next();
  },
}));

import simpleWorkOrdersRouter from '../simpleWorkOrders';

describe('simple work orders routes', () => {
  let app: express.Express;

  beforeEach(() => {
    prismaMock.workOrder.findMany.mockReset();
    prismaMock.workOrder.create.mockReset();

    app = express();
    app.use(express.json());
    app.use('/api/work-orders', simpleWorkOrdersRouter);
  });

  it('scopes list requests to the authenticated tenant', async () => {
    const sampleWorkOrders = [
      {
        id: 'wo-tenant-1',
        tenantId: 'tenant-1',
        title: 'Inspect pump',
        description: 'Check the primary pump',
        status: 'requested',
        priority: 'medium',
        assetId: null,
        assigneeId: null,
        category: null,
        attachments: [],
      },
      {
        id: 'wo-tenant-2',
        tenantId: 'tenant-2',
        title: 'Lubricate motor',
        description: 'Lubricate bearings',
        status: 'assigned',
        priority: 'high',
        assetId: null,
        assigneeId: null,
        category: null,
        attachments: [],
      },
    ];

    prismaMock.workOrder.findMany.mockImplementation(({ where }: { where: { tenantId?: string } }) => {
      return sampleWorkOrders
        .filter((order) => order.tenantId === where?.tenantId)
        .map((order) => ({
          ...order,
          asset: null,
          assignee: null,
          createdByUser: { id: 'creator-1', name: 'Creator One' },
          createdAt: new Date('2024-05-01T10:00:00Z'),
          updatedAt: new Date('2024-05-02T10:00:00Z'),
          dueDate: null,
          timeSpentMin: null,
        }));
    });

    const tenantOneResponse = await request(app)
      .get('/api/work-orders')
      .set(
        'X-Test-User',
        JSON.stringify({
          id: 'user-1',
          email: 'tech1@example.com',
          name: 'Tenant One User',
          role: 'technician',
          tenantId: 'tenant-1',
        }),
      );

    expect(tenantOneResponse.status).toBe(200);
    expect(tenantOneResponse.body.data).toHaveLength(1);
    expect(tenantOneResponse.body.data[0].id).toBe('wo-tenant-1');

    const tenantTwoResponse = await request(app)
      .get('/api/work-orders')
      .set(
        'X-Test-User',
        JSON.stringify({
          id: 'user-2',
          email: 'tech2@example.com',
          name: 'Tenant Two User',
          role: 'technician',
          tenantId: 'tenant-2',
        }),
      );

    expect(tenantTwoResponse.status).toBe(200);
    expect(tenantTwoResponse.body.data).toHaveLength(1);
    expect(tenantTwoResponse.body.data[0].id).toBe('wo-tenant-2');

    expect(prismaMock.workOrder.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-1' }),
      }),
    );
    expect(prismaMock.workOrder.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-2' }),
      }),
    );
  });

  it('creates work orders under the authenticated tenant', async () => {
    const createdAt = new Date('2024-05-03T09:00:00Z');
    const createdWorkOrder = {
      id: 'wo-created',
      tenantId: 'tenant-1',
      title: 'Replace belt',
      description: 'Replace worn conveyor belt',
      status: 'requested',
      priority: 'medium',
      assetId: null,
      assigneeId: null,
      category: null,
      attachments: [],
      asset: null,
      assignee: null,
      createdByUser: { id: 'user-1', name: 'Manager User' },
      createdAt,
      updatedAt: createdAt,
      dueDate: null,
      timeSpentMin: null,
    };

    prismaMock.workOrder.create.mockResolvedValue(createdWorkOrder);

    const response = await request(app)
      .post('/api/work-orders')
      .set(
        'X-Test-User',
        JSON.stringify({
          id: 'user-1',
          email: 'manager@example.com',
          name: 'Manager User',
          role: 'manager',
          tenantId: 'tenant-1',
        }),
      )
      .send({
        title: 'Replace belt',
        description: 'Replace worn conveyor belt',
        priority: 'medium',
      });

    expect(response.status).toBe(200);
    expect(prismaMock.workOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          createdBy: 'user-1',
        }),
      }),
    );
    expect(response.body.data.id).toBe('wo-created');
    expect(response.body.data.requestedById).toBe('user-1');
  });

  it('returns 403 when the user lacks permission to create work orders', async () => {
    const response = await request(app)
      .post('/api/work-orders')
      .set(
        'X-Test-User',
        JSON.stringify({
          id: 'user-3',
          email: 'viewer@example.com',
          name: 'Viewer User',
          role: 'viewer',
          tenantId: 'tenant-1',
        }),
      )
      .send({
        title: 'Check gauges',
        description: 'Verify gauge readings',
      });

    expect(response.status).toBe(403);
    expect(response.body.error?.code).toBe(403);
    expect(prismaMock.workOrder.create).not.toHaveBeenCalled();
  });
});
