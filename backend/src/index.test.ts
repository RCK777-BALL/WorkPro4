import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('mongodb', () => ({
  ObjectId: class {
    value: string;

    constructor(value: string) {
      this.value = value;
    }

    toString(): string {
      return this.value;
    }

    toHexString(): string {
      return this.value;
    }

    static isValid(value: string): boolean {
      return typeof value === 'string' && value.length === 24;
    }
  },
}));

const originalDatabaseUrl = process.env.DATABASE_URL;
const verifyDatabaseConnection = vi.fn();
const ensureTenantNoTxn = vi.fn();
const ensureAdminNoTxn = vi.fn();
const dotenvConfig = vi.fn();
const expressJson = vi.fn();
const expressUrlencoded = vi.fn();
const expressApp = {
  use: vi.fn(),
  get: vi.fn(),
  listen: vi.fn(),
};
const corsMiddleware = vi.fn();
const corsFactory = vi.fn(() => corsMiddleware);
const helmetMiddleware = vi.fn();
const helmetFactory = vi.fn(() => helmetMiddleware);
const rateLimitMiddleware = vi.fn();
const rateLimitFactory = vi.fn(() => rateLimitMiddleware);
const ensureJwtSecrets = vi.fn();

vi.mock('dotenv', () => ({
  default: { config: dotenvConfig },
  config: dotenvConfig,
}));

const createRouter = () => ({
  use: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
});

vi.mock('express', () => {
  const express = () => expressApp;
  express.json = () => expressJson;
  express.urlencoded = () => expressUrlencoded;
  return { default: express, Router: createRouter };
});

vi.mock('cors', () => ({
  default: corsFactory,
}));

vi.mock('helmet', () => ({
  default: helmetFactory,
}));

vi.mock('express-rate-limit', () => ({
  default: rateLimitFactory,
}));

vi.mock('./db', () => ({
  prisma: {},
  verifyDatabaseConnection,
}));

vi.mock('./config/auth', () => ({
  ensureJwtSecrets,
}));

vi.mock('./lib/seedHelpers', () => ({
  ensureTenantNoTxn,
  ensureAdminNoTxn,
}));

vi.mock('./routes/auth', () => ({ default: {} }));
vi.mock('./routes/summary', () => ({ default: {} }));
vi.mock('./routes/simpleWorkOrders', () => ({ default: {} }));
vi.mock('./routes/assets', () => ({ default: {} }));
vi.mock('./routes/parts', () => ({ default: {} }));
vi.mock('./routes/vendors', () => ({ default: {} }));
vi.mock('./routes/search', () => ({ default: {} }));

describe('server startup', () => {
  beforeEach(() => {
    vi.resetModules();
    verifyDatabaseConnection.mockClear();
    ensureTenantNoTxn.mockReset();
    ensureAdminNoTxn.mockReset();
    expressApp.use.mockReset();
    expressApp.get.mockReset();
    expressApp.listen.mockReset();
    expressJson.mockReset();
    expressUrlencoded.mockReset();
    corsFactory.mockReset();
    corsMiddleware.mockReset();
    helmetFactory.mockReset();
    helmetMiddleware.mockReset();
    rateLimitFactory.mockReset();
    rateLimitMiddleware.mockReset();
    ensureTenantNoTxn.mockResolvedValue({ tenant: { id: 'tenant-id', slug: 'tenant-slug' }, created: true });
    ensureAdminNoTxn.mockResolvedValue({ admin: { id: 'admin-id' }, created: true });
    delete process.env.DATABASE_URL;
    process.env.DATABASE_URL = '';
    process.env.SEED_SAMPLE_WORK_ORDER = 'false';
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    delete process.env.SEED_SAMPLE_WORK_ORDER;
  });

  it('exits when DATABASE_URL is missing', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    try {
      await import('./index');
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(verifyDatabaseConnection).not.toHaveBeenCalled();
    } finally {
      exitSpy.mockRestore();
    }
  });

  it('starts successfully when the default admin already exists', async () => {
    process.env.DATABASE_URL = 'mongodb://localhost:27017/app?directConnection=true';
    ensureTenantNoTxn.mockResolvedValue({
      tenant: { id: '507F1F77BCF86CD799439011', slug: 'demo-tenant' },
      created: false,
    });
    ensureAdminNoTxn.mockResolvedValue({
      admin: {
        id: '507F1F77BCF86CD799439012',
        tenantId: '507F1F77BCF86CD799439011',
        email: 'admin@demo.com',
        name: 'Admin',
        role: 'admin',
        passwordHash: 'stored-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      created: false,
      updated: false,
    });
    verifyDatabaseConnection.mockResolvedValue(undefined);
    expressApp.listen.mockImplementation(((_port: number, callback?: () => void) => {
      callback?.();
      return { close: vi.fn() } as never;
    }) as never);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    try {
      await import('./index');

      await vi.waitFor(() => {
        expect(expressApp.listen).toHaveBeenCalled();
      });

      expect(ensureTenantNoTxn).toHaveBeenCalledTimes(1);
      expect(ensureAdminNoTxn).toHaveBeenCalledWith(
        expect.objectContaining({
          prisma: expect.any(Object),
          email: 'admin@demo.com',
          name: 'Admin',
          password: 'Admin@123',
          role: 'admin',
        }),
      );
      expect(ensureAdminNoTxn).toHaveBeenCalledTimes(1);
      expect(exitSpy).not.toHaveBeenCalled();
    } finally {
      exitSpy.mockRestore();
    }
  });
});
