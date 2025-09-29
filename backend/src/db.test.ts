import { beforeEach, describe, expect, it, vi } from 'vitest';

const connectMock = vi.fn().mockResolvedValue(undefined);
let exposeRunCommand = true;

vi.mock('@prisma/client', () => {
  class PrismaClientMock {
    public $connect = connectMock;

    constructor(_: unknown) {
      if (exposeRunCommand) {
        // Vitest will automatically hoist mocks, so we create the method lazily.
        (this as unknown as { $runCommandRaw: () => Promise<unknown> }).$runCommandRaw = vi
          .fn()
          .mockResolvedValue({ ok: 1 });
      }
    }
  }

  return { PrismaClient: PrismaClientMock };
});

beforeEach(() => {
  exposeRunCommand = true;
  connectMock.mockClear();
  delete (globalThis as { __workpro_prisma?: unknown }).__workpro_prisma;
  vi.resetModules();
});

describe('sanitizeDatabaseUrl', () => {
  it('adds directConnection to bare MongoDB URLs', async () => {
    const { sanitizeDatabaseUrl } = await import('./db');

    expect(sanitizeDatabaseUrl('mongodb://localhost:27017/app')).toBe(
      'mongodb://localhost:27017/app?directConnection=true',
    );
  });

  it('preserves replica set URLs without forcing direct connections', async () => {
    const { sanitizeDatabaseUrl } = await import('./db');

    expect(sanitizeDatabaseUrl('mongodb://localhost:27017/app?replicaSet=rs0')).toBe(
      'mongodb://localhost:27017/app?replicaSet=rs0',
    );
  });
});

describe('verifyDatabaseConnection', () => {
  it('resolves when $runCommandRaw is unavailable', async () => {
    exposeRunCommand = false;
    const { verifyDatabaseConnection } = await import('./db');

    await expect(verifyDatabaseConnection()).resolves.toBeUndefined();
    expect(connectMock).toHaveBeenCalledTimes(1);
  });
});
