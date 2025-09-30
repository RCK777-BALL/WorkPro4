import { describe, expect, it, vi } from 'vitest';

vi.mock('mongodb', () => ({
  ObjectId: class {
    value: string;

    constructor(value: string) {
      this.value = value;
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
  it('recovers from P2023 error by backfilling timestamps and proceeds', async () => {
    const tenantId = 'tenant-1';
    const email = 'admin@example.com';
    const name = 'Admin';
    const role = 'ADMIN';
    const passwordHash = 'hash';

    const existingUser = {
      id: 'user-1',
      tenantId,
      email,
      name: 'Old Name',
      role: 'USER',
      passwordHash: 'old-hash',
    } satisfies Record<string, unknown>;

    const updatedUser = {
      ...existingUser,
      name,
      role,
      passwordHash,
    } satisfies Record<string, unknown>;

    const recoveryError = Object.assign(new Error('malformed document'), {
      code: 'P2023',
      clientVersion: 'test',
    });
    Object.setPrototypeOf(recoveryError, Prisma.PrismaClientKnownRequestError.prototype);

    const findUnique = vi
      .fn()
      .mockRejectedValueOnce(recoveryError as Prisma.PrismaClientKnownRequestError)
      .mockResolvedValueOnce(existingUser);
    const update = vi.fn().mockResolvedValue(updatedUser);
    const create = vi.fn();
    const runCommandRaw = vi.fn().mockResolvedValue({ ok: 1 });

    const prisma = {
      user: {
        findUnique,
        update,
        create,
      },
      $runCommandRaw: runCommandRaw,
    } as unknown as PrismaClient;

    const result = await ensureAdminNoTxn({
      prisma,
      tenantId,
      email,
      name,
      passwordHash,
      role,
    });

    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(runCommandRaw).toHaveBeenCalledTimes(1);

    const updateCommand = runCommandRaw.mock.calls[0][0];
    expect(updateCommand.update).toBe('users');
    expect(updateCommand.updates).toHaveLength(1);

    const [updateOperation] = updateCommand.updates;
    expect(updateOperation.q.email).toBe(email);
    expect(updateOperation.q.$or).toEqual([
      { createdAt: { $exists: false } },
      { createdAt: { $type: 10 } },
      { createdAt: { $type: 'string' } },
      { updatedAt: { $exists: false } },
      { updatedAt: { $type: 10 } },
      { updatedAt: { $type: 'string' } },
    ]);
    expect(Array.isArray(updateOperation.u)).toBe(true);
    expect(updateOperation.u).toHaveLength(1);

    const [userUpdateStage] = updateOperation.u;
    const userCreatedAtFallback = userUpdateStage.$set.createdAt.$cond?.[2]?.$ifNull?.[1];
    const userUpdatedAtFallback = userUpdateStage.$set.updatedAt.$cond?.[2]?.$ifNull?.[1];

    expect(userCreatedAtFallback).toBeInstanceOf(Date);
    expect(userUpdatedAtFallback).toBeInstanceOf(Date);

    expect(update).toHaveBeenCalledWith({
      where: { email },
      data: { tenantId, name, role, passwordHash },
    });
    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({ admin: updatedUser, created: false });
  });
});
