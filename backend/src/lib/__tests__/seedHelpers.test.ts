import { describe, expect, it, vi } from 'vitest';

vi.mock('@prisma/client', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    clientVersion: string;

    constructor(message: string, options: { code: string; clientVersion: string }) {
      super(message);
      this.code = options.code;
      this.clientVersion = options.clientVersion;
    }
  }

  return {
    Prisma: { PrismaClientKnownRequestError },
    PrismaClient: class {},
  };
});

import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import { ensureTenantNoTxn } from '../seedHelpers';

describe('ensureTenantNoTxn', () => {
  it('recovers from P2032 error by backfilling timestamps and returns the tenant', async () => {
    const tenantName = 'Acme Corp';
    const slug = tenantName.toLowerCase().replace(/\s+/g, '-');
    const tenant = { id: 'tenant-1', name: tenantName, slug };

    const recoveryError = Object.assign(new Error('missing timestamps'), {
      code: 'P2032',
      clientVersion: 'test',
    });
    Object.setPrototypeOf(recoveryError, Prisma.PrismaClientKnownRequestError.prototype);

    const findUnique = vi
      .fn()
      .mockRejectedValueOnce(recoveryError as Prisma.PrismaClientKnownRequestError)
      .mockResolvedValueOnce(tenant);
    const runCommandRaw = vi.fn().mockResolvedValue({ ok: 1 });

    const prisma = {
      tenant: {
        findUnique,
        update: vi.fn(),
        create: vi.fn(),
      },
      $runCommandRaw: runCommandRaw,
    } as unknown as PrismaClient;

    const result = await ensureTenantNoTxn(prisma, tenantName);

    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(runCommandRaw).toHaveBeenCalledTimes(1);

    expect(runCommandRaw).toHaveBeenCalledWith({
      update: 'tenants',
      updates: [
        {
          q: {
            slug,
            $or: [
              { createdAt: { $exists: false } },
              { updatedAt: { $exists: false } },
            ],
          },
          u: {
            $set: {
              createdAt: expect.any(Date),
              updatedAt: expect.any(Date),
            },
          },
          upsert: false,
          multi: true,
        },
      ],
    });

    expect(result).toEqual({ tenant, created: false });
  });
});
