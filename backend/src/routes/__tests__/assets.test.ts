import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import assetsRouter from '../assets';

const prismaMock = vi.hoisted(() => ({
  asset: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const auditLogMock = vi.hoisted(() => vi.fn());

const authenticateTokenMock = vi.hoisted(() =>
  vi.fn((req: any, _res: any, next: () => void) => {
    req.user = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      role: 'admin',
      tenantId: 'tenant-1',
      siteId: 'site-1',
    };
    next();
  }),
);

vi.mock('../../db', () => ({
  prisma: prismaMock,
}));

vi.mock('../../middleware/audit', () => ({
  auditLog: auditLogMock,
}));

vi.mock('../../middleware/auth', () => ({
  authenticateToken: authenticateTokenMock,
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/assets', assetsRouter);
  return app;
}

describe('assets router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.asset.findFirst.mockReset();
    prismaMock.asset.update.mockReset();
    prismaMock.asset.delete.mockReset();
    auditLogMock.mockReset();
    authenticateTokenMock.mockReset();
    authenticateTokenMock.mockImplementation((req: any, _res: any, next: () => void) => {
      req.user = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        role: 'admin',
        tenantId: 'tenant-1',
        siteId: 'site-1',
      };
      next();
    });
  });

  describe('PATCH /api/assets/:id', () => {
    it('updates an asset and returns the serialized payload', async () => {
      const app = createApp();

      const existingAsset = {
        id: 'asset-1',
        tenantId: 'tenant-1',
        siteId: 'site-1',
        code: 'A-100',
        name: 'Pump A',
        location: 'Line 1',
        category: 'Pump',
        purchaseDate: new Date('2023-01-01T00:00:00.000Z'),
        cost: 1000,
        status: 'operational',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      } as const;

      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);
      prismaMock.asset.update.mockResolvedValue({
        ...existingAsset,
        name: 'Pump B',
        location: 'Line 2',
        status: 'maintenance',
        updatedAt: new Date('2024-03-01T00:00:00.000Z'),
      });

      const response = await request(app)
        .patch('/api/assets/asset-1')
        .send({
          name: 'Pump B',
          location: 'Line 2',
          status: 'maintenance',
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toBeNull();
      expect(response.body.data).toMatchObject({
        id: 'asset-1',
        name: 'Pump B',
        location: 'Line 2',
        status: 'maintenance',
      });
      expect(prismaMock.asset.update).toHaveBeenCalledWith({
        where: { id: 'asset-1' },
        data: { name: 'Pump B', location: 'Line 2', status: 'maintenance' },
      });
      expect(auditLogMock).toHaveBeenCalledWith('asset.updated', expect.any(Object));
    });

    it('rejects invalid status transitions', async () => {
      const app = createApp();

      prismaMock.asset.findFirst.mockResolvedValue({
        id: 'asset-1',
        tenantId: 'tenant-1',
        siteId: 'site-1',
        code: 'A-100',
        name: 'Pump A',
        location: null,
        category: null,
        purchaseDate: null,
        cost: null,
        status: 'decommissioned',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });

      const response = await request(app)
        .patch('/api/assets/asset-1')
        .send({ status: 'operational' });

      expect(response.status).toBe(409);
      expect(response.body.error).toMatchObject({
        code: 409,
      });
      expect(prismaMock.asset.update).not.toHaveBeenCalled();
    });

    it('returns 404 when asset does not exist', async () => {
      const app = createApp();

      prismaMock.asset.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/assets/asset-1')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error?.message).toBe('Asset not found');
      expect(prismaMock.asset.update).not.toHaveBeenCalled();
    });

    it('returns 400 for unknown fields', async () => {
      const app = createApp();

      const response = await request(app)
        .patch('/api/assets/asset-1')
        .send({ tenantId: 'tenant-1' });

      expect(response.status).toBe(400);
      expect(response.body.error?.message).toBe('Validation error');
      expect(prismaMock.asset.findFirst).not.toHaveBeenCalled();
    });

    it('returns 401 when user context missing', async () => {
      const app = createApp();

      authenticateTokenMock.mockImplementationOnce((_req: any, _res: any, next: () => void) => {
        next();
      });

      const response = await request(app)
        .patch('/api/assets/asset-1')
        .send({ name: 'Updated' });

      expect(response.status).toBe(401);
      expect(response.body.error?.message).toBe('Authentication required');
      expect(prismaMock.asset.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/assets/:id', () => {
    it('deletes an asset for the current tenant', async () => {
      const app = createApp();

      const existingAsset = {
        id: 'asset-1',
        tenantId: 'tenant-1',
        siteId: 'site-1',
        code: 'A-100',
        name: 'Pump A',
        location: null,
        category: null,
        purchaseDate: null,
        cost: null,
        status: 'operational',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      } as const;

      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);
      prismaMock.asset.delete.mockResolvedValue(existingAsset);

      const response = await request(app).delete('/api/assets/asset-1');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ id: 'asset-1' });
      expect(prismaMock.asset.delete).toHaveBeenCalledWith({ where: { id: 'asset-1' } });
      expect(auditLogMock).toHaveBeenCalledWith('asset.deleted', expect.any(Object));
    });

    it('returns 404 when asset not found for tenant', async () => {
      const app = createApp();

      prismaMock.asset.findFirst.mockResolvedValue(null);

      const response = await request(app).delete('/api/assets/asset-1');

      expect(response.status).toBe(404);
      expect(response.body.error?.message).toBe('Asset not found');
      expect(prismaMock.asset.delete).not.toHaveBeenCalled();
    });

    it('returns 401 when authentication fails', async () => {
      const app = createApp();

      authenticateTokenMock.mockImplementationOnce((_req: any, _res: any, next: () => void) => {
        next();
      });

      const response = await request(app).delete('/api/assets/asset-1');

      expect(response.status).toBe(401);
      expect(response.body.error?.message).toBe('Authentication required');
      expect(prismaMock.asset.findFirst).not.toHaveBeenCalled();
    });
  });
});
