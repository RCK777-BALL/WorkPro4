import { describe, expect, it, vi } from 'vitest';

vi.mock('@prisma/client', () => {
  class PrismaClientMock {
    constructor(_: unknown) {}
  }

  return { PrismaClient: PrismaClientMock };
});

import { sanitizeDatabaseUrl } from './db';

describe('sanitizeDatabaseUrl', () => {
  it('adds directConnection to bare MongoDB URLs', () => {
    const sanitized = sanitizeDatabaseUrl('mongodb://localhost:27017/app');

    expect(sanitized).toBe('mongodb://localhost:27017/app?directConnection=true');
  });

  it('preserves replica set URLs without forcing direct connections', () => {
    const sanitized = sanitizeDatabaseUrl('mongodb://localhost:27017/app?replicaSet=rs0');

    expect(sanitized).toBe('mongodb://localhost:27017/app?replicaSet=rs0');
  });
});
