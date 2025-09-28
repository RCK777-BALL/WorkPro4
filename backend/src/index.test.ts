import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('dotenv', () => ({
  default: { config: dotenvConfig },
  config: dotenvConfig,
}));

vi.mock('express', () => {
  const express = () => expressApp;
  express.json = () => expressJson;
  express.urlencoded = () => expressUrlencoded;
  return { default: express };
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
});
