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
