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
  it('finds an existing tenant before creating a new one', async () => {
    const tenantName = 'Acme Corp';
    const trimmedName = 'Acme Corp';
    const tenant = { id: '507f1f77bcf86cd799439011', name: trimmedName };

    const findFirst = vi.fn().mockResolvedValueOnce(tenant);
    const create = vi.fn();

    const prisma = {
      tenant: {
        findFirst,
        create,
      },
    } as unknown as PrismaClient;

    const result = await ensureTenantNoTxn(prisma, `  ${tenantName}  `);

    expect(findFirst).toHaveBeenCalledWith({ where: { name: trimmedName } });
    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({ tenant, created: false });
  });
});

describe('ensureAdminNoTxn', () => {
  it('recovers from P2023 error by backfilling timestamps and upserting via raw command', async () => {
    const tenantId = '507f1f77bcf86cd799439011';
    const email = 'Admin@example.com';
    const normalizedEmail = email.toLowerCase();
    const name = 'Admin';
    const role = 'ADMIN';
    const passwordHash = 'hash';

    const existingUser = {
      id: '507f1f77bcf86cd799439012',
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

    const now = new Date();
    const findUnique = vi.fn().mockRejectedValue(recoveryError as Prisma.PrismaClientKnownRequestError);
    const rawUser = {
      _id: { toString: () => '507f1f77bcf86cd799439012', toHexString: () => '507f1f77bcf86cd799439012' },
      tenant_id: { toString: () => tenantId, toHexString: () => tenantId },
      email: normalizedEmail,
      password_hash: passwordHash,
      name,
      role,
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
      role,
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

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(upsertCommand.upsert).toBe(true);
    expect(upsertCommand.new).toBe(true);

    const updateSet = upsertCommand.update.$set;
    expect(updateSet.role).toBe(role);
    expect(updateSet.roles).toBeUndefined();

    expect(result.created).toBe(false);
    expect(result.admin.id).toBe('507f1f77bcf86cd799439012');
    expect(result.admin.tenantId).toBe(tenantId);
    expect(result.admin.email).toBe(normalizedEmail);
    expect(result.admin.passwordHash).toBe(passwordHash);
    expect(result.admin.name).toBe(name);
    expect(result.admin.role).toBe(role);
    expect(result.admin.createdAt).toBeInstanceOf(Date);
    expect(result.admin.updatedAt).toBeInstanceOf(Date);
  });
});
