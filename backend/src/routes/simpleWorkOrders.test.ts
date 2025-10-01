import type { Request, Response } from 'express';
import { describe, expect, it, beforeEach, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
  },
  workOrder: {
    create: vi.fn(),
  },
})) as {
  user: { findFirst: ReturnType<typeof vi.fn> };
  workOrder: { create: ReturnType<typeof vi.fn> };
};

vi.mock('mongodb', () => ({
  ObjectId: class {
    toHexString() {
      return 'mock-object-id';
    }
  },
}));

vi.mock('express', () => {
  const routes: any[] = [];

  const router = {
    stack: routes,
    get(path: string, ...handlers: Array<(req: Request, res: Response, next: (err?: unknown) => void) => void>) {
      routes.push({
        route: {
          path,
          methods: { get: true },
          stack: handlers.map((handle) => ({ handle })),
        },
      });
      return router;
    },
    post(path: string, ...handlers: Array<(req: Request, res: Response, next: (err?: unknown) => void) => void>) {
      routes.push({
        route: {
          path,
          methods: { post: true },
          stack: handlers.map((handle) => ({ handle })),
        },
      });
      return router;
    },
  };

  return { Router: () => router };
});

vi.mock('../db', () => ({
  prisma: prismaMock,
}));

import router from './simpleWorkOrders';

function getPostHandler() {
  const stack = (router as unknown as { stack: any[] }).stack;
  const layer = stack.find(
    (item) => item.route?.path === '/' && item.route?.methods?.post,
  );

  if (!layer) {
    throw new Error('POST / handler not found');
  }

  return layer.route.stack[0].handle as (req: Request, res: Response, next: (err?: unknown) => void) => void;
}

async function invokePost(body: unknown) {
  const handler = getPostHandler();
  const req = { body } as Request;
  let statusCode = 200;

  return new Promise<{ statusCode: number; payload: unknown }>((resolve, reject) => {
    const res = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return res;
      }),
      json: vi.fn((payload: unknown) => {
        resolve({ statusCode, payload });
        return res;
      }),
    } as unknown as Response;

    const next = vi.fn((err?: unknown) => {
      if (err) {
        reject(err);
      } else {
        resolve({ statusCode, payload: null });
      }
    });

    try {
      handler(req, res, next);
    } catch (error) {
      reject(error);
    }
  });
}

describe('simpleWorkOrders POST /', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when assetId fails normalization', async () => {
    const response = await invokePost({
      title: 'Broken machine',
      assetId: 'not-a-valid-id',
    });

    expect(response.statusCode).toBe(400);
    expect(response.payload).toEqual({
      data: null,
      error: {
        code: 400,
        message: 'Invalid assetId',
        details: undefined,
      },
    });
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.workOrder.create).not.toHaveBeenCalled();
  });

  it('creates a work order when assetId is valid', async () => {
    const now = new Date();

    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      tenantId: 'tenant-1',
      name: 'Requester',
    });

    prismaMock.workOrder.create.mockResolvedValue({
      id: 'order-1',
      title: 'Broken machine',
      description: 'Needs inspection',
      status: 'requested',
      priority: 'medium',
      assetId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      asset: null,
      lineName: null,
      stationNumber: null,
      assignees: [],
      createdByUser: { id: 'user-1', name: 'Requester' },
      createdAt: now,
      updatedAt: now,
      checklists: [],
      timeSpentMin: null,
    });

    const response = await invokePost({
      title: 'Broken machine',
      description: 'Needs inspection',
      assetId: 'AAAAAAAAAAAAAAAAAAAAAAAA',
    });

    expect(prismaMock.user.findFirst).toHaveBeenCalledTimes(1);
    expect(prismaMock.workOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assetId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        }),
      }),
    );

    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({
      data: expect.objectContaining({
        id: 'order-1',
        assetId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      }),
      error: null,
    });
  });
});
