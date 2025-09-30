import { describe, expect, it, vi } from 'vitest';

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

import { ensureAdminNoTxn, ensureTenantNoTxn } from '../seedHelpers';

describe('ensureTenantNoTxn', () => {
  it('recovers from P2032 error by backfilling timestamps and returns the tenant', async () => {
    const tenantName = 'Acme Corp';
    const slug = tenantName.toLowerCase().replace(/\s+/g, '-');
    const tenant = { id: '507f1f77bcf86cd799439011', name: tenantName, slug };

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

    const updateArgs = runCommandRaw.mock.calls[0][0];
    expect(updateArgs.update).toBe('tenants');
    expect(updateArgs.updates).toHaveLength(1);

    const [update] = updateArgs.updates;
    expect(update.q.slug).toBe(slug);
    expect(update.q.$or).toEqual([
      { createdAt: { $exists: false } },
      { createdAt: { $type: 10 } },
      { createdAt: { $type: 'string' } },
      { updatedAt: { $exists: false } },
      { updatedAt: { $type: 10 } },
      { updatedAt: { $type: 'string' } },
    ]);
    expect(Array.isArray(update.u)).toBe(true);
    expect(update.u).toHaveLength(1);

    const [updateStage] = update.u;
    const createdAtFallback = updateStage.$set.createdAt.$cond?.[2]?.$ifNull?.[1];
    const updatedAtFallback = updateStage.$set.updatedAt.$cond?.[2]?.$ifNull?.[1];

    expect(createdAtFallback).toBeInstanceOf(Date);
    expect(updatedAtFallback).toBeInstanceOf(Date);
    expect(update.multi).toBe(true);

    expect(result).toEqual({ tenant, created: false });
  });
});

describe('ensureAdminNoTxn', () => {
  it('creates a new admin when one does not exist', async () => {
    const tenantId = '507F1F77BCF86CD799439011';
    const email = ' Admin@example.com ';
    const name = 'Admin';
    const role = ' ADMIN ';
    const passwordHash = 'hash';

    const createdUser = {
      id: '507f1f77bcf86cd799439012',
      tenantId: tenantId.toLowerCase(),
      email: email.trim().toLowerCase(),
      name,
      role: role.trim(),
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Record<string, unknown>;

    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(createdUser),
        update: vi.fn(),
      },
    } as unknown as PrismaClient;

    const result = await ensureAdminNoTxn({
      prisma,
      tenantId,
      email,
      name,
      passwordHash,
      role,
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'admin@example.com' } });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        tenantId: tenantId.toLowerCase(),
        email: 'admin@example.com',
        name,
        role: 'ADMIN',
        passwordHash,
      },
    });

    expect(result).toEqual({
      admin: {
        ...createdUser,
        id: createdUser.id,
        tenantId: tenantId.toLowerCase(),
        email: 'admin@example.com',
        role: 'ADMIN',
      },
      created: true,
    });
  });

  it('updates an existing admin when one is found', async () => {
    const tenantId = '507f1f77bcf86cd799439011';
    const email = 'admin@example.com';
    const name = 'Admin';
    const role = 'admin';
    const passwordHash = 'hash';

    const existingUser = {
      id: '507f1f77bcf86cd799439012',
      tenantId,
      email,
      name: 'Old Name',
      role: 'user',
      passwordHash: 'old-hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Record<string, unknown>;

    const updatedUser = {
      ...existingUser,
      tenantId,
      email,
      name,
      role,
      passwordHash,
    } satisfies Record<string, unknown>;

    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(existingUser),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(updatedUser),
      },
    } as unknown as PrismaClient;

    const result = await ensureAdminNoTxn({
      prisma,
      tenantId,
      email,
      name,
      passwordHash,
      role,
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email },
      data: {
        tenantId,
        email,
        name,
        role,
        passwordHash,
      },
    });

    expect(result).toEqual({
      admin: {
        ...updatedUser,
        tenantId,
        email,
        role,
      },
      updated: true,
    });
  });
});
