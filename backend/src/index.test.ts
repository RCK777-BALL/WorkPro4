import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const originalDatabaseUrl = process.env.DATABASE_URL;
const verifyDatabaseConnection = vi.fn();

vi.mock('./db', () => ({
  prisma: {},
  verifyDatabaseConnection,
}));

describe('server startup', () => {
  beforeEach(() => {
    vi.resetModules();
    verifyDatabaseConnection.mockClear();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
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
