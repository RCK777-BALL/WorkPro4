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

    static isValid(value: string): boolean {
      return Boolean(value);
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
  it('recovers from P2023 error by backfilling timestamps and upserting via raw command', async () => {
    const tenantId = 'tenant-1';
    const email = 'Admin@example.com';
    const normalizedEmail = email.toLowerCase();
    const name = 'Admin';
    const roles = ['ADMIN'];
    const passwordHash = 'hash';

    const recoveryError = Object.assign(new Error('malformed document'), {
      code: 'P2023',
      clientVersion: 'test',
    });
    Object.setPrototypeOf(recoveryError, Prisma.PrismaClientKnownRequestError.prototype);

    const now = new Date();
    const findUnique = vi.fn().mockRejectedValue(recoveryError as Prisma.PrismaClientKnownRequestError);
    const rawUser = {
      _id: { toString: () => 'user-1' },
      tenant_id: { toString: () => tenantId },
      email: normalizedEmail,
      password_hash: passwordHash,
      name,
      role: roles[0],
      createdAt: now,
      updatedAt: now,
    };

    const runCommandRaw = vi
      .fn()
      .mockResolvedValueOnce({ ok: 1 })
      .mockResolvedValueOnce({ value: rawUser, lastErrorObject: { updatedExisting: true } });

    const prisma = {
      user: {
        findUnique,
        update: vi.fn(),
        create: vi.fn(),
      },
      $runCommandRaw: runCommandRaw,
    } as unknown as PrismaClient;

    const result = await ensureAdminNoTxn({
      prisma,
      tenantId,
      email,
      name,
      passwordHash,
      roles,
    });

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({ where: { email: normalizedEmail } });
    expect(runCommandRaw).toHaveBeenCalledTimes(2);

    const [backfillCommand, upsertCommand] = runCommandRaw.mock.calls.map(([arg]) => arg);

    expect(backfillCommand.update).toBe('users');
    expect(backfillCommand.updates).toHaveLength(1);
    const [backfillOperation] = backfillCommand.updates;
    expect(backfillOperation.q.email).toBe(normalizedEmail);
    expect(Array.isArray(backfillOperation.u)).toBe(true);

    expect(upsertCommand.findAndModify).toBe('users');
    expect(upsertCommand.query).toEqual({ email: normalizedEmail });
    expect(upsertCommand.update.$set).toMatchObject({
      tenant_id: expect.anything(),
      email: normalizedEmail,
      name,
      password_hash: passwordHash,
      roles,
      role: roles[0],
    });
    expect(upsertCommand.upsert).toBe(true);
    expect(upsertCommand.new).toBe(true);

    expect(result.created).toBe(false);
    expect(result.admin.id).toBe('user-1');
    expect(result.admin.tenantId).toBe(tenantId);
    expect(result.admin.email).toBe(normalizedEmail);
    expect(result.admin.passwordHash).toBe(passwordHash);
    expect(result.admin.name).toBe(name);
    expect(result.admin.role).toBe(roles[0]);
    expect(result.admin.createdAt).toBeInstanceOf(Date);
    expect(result.admin.updatedAt).toBeInstanceOf(Date);
  });
});
