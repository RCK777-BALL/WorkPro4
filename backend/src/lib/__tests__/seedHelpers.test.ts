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

import type { PrismaClient } from '@prisma/client';

import { ensureAdminNoTxn, ensureTenantNoTxn } from '../seedHelpers';

describe('ensureTenantNoTxn', () => {
   it('returns an existing tenant without performing raw updates', async () => {
    const tenantName = 'Acme Corp';
    const slug = 'acme-corp';
    const tenant = { id: '507F1F77BCF86CD799439011', name: tenantName, slug };

    const findUnique = vi.fn().mockResolvedValue(tenant);
    const update = vi.fn();
    const create = vi.fn();

    const prisma = {
      tenant: {
        findUnique,
        update,
        create,
      },
    } as unknown as PrismaClient;

    const result = await ensureTenantNoTxn(prisma, tenantName);

    expect(findUnique).toHaveBeenCalledWith({ where: { slug } });
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({
      tenant: { id: '507f1f77bcf86cd799439011', name: tenantName, slug },
      created: false,
    });
  });

  it('creates a tenant when none exists', async () => {
    const tenantName = 'New Tenant';
    const slug = 'new-tenant';
    const createdTenant = { id: '507F1F77BCF86CD799439012', name: tenantName, slug };

    const findUnique = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue(createdTenant);

    const prisma = {
      tenant: {
        findUnique,
        update: vi.fn(),

        create,
      },
    } as unknown as PrismaClient;

    const result = await ensureTenantNoTxn(prisma, `  ${tenantName}  `);

    expect(findUnique).toHaveBeenCalledWith({ where: { slug } });
    expect(create).toHaveBeenCalledWith({ data: { name: tenantName, slug } });
    expect(result).toEqual({
      tenant: { id: '507f1f77bcf86cd799439012', name: tenantName, slug },

      created: true,
    });
  });

describe('ensureAdminNoTxn', () => {
  it('creates an admin with normalized inputs when no user exists', async () => {
    const tenantId = '507F1F77BCF86CD799439011';
    const email = ' Admin@example.com ';
    const normalizedEmail = 'admin@example.com';
    const normalizedTenantId = '507f1f77bcf86cd799439011';

    const name = 'Admin';
    const role = 'admin';
    const passwordHash = 'hash';

    const findUnique = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({
      id: '507F1F77BCF86CD799439012',
      tenantId,
      email,

      name,
      role,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const update = vi.fn();

    const prisma = {
      user: {
        findUnique,
        create,
        update,
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

    expect(findUnique).toHaveBeenCalledWith({ where: { email: normalizedEmail } });
    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: normalizedTenantId,
        email: normalizedEmail,
        name,
        role,
        passwordHash,
      },
    });
    expect(update).not.toHaveBeenCalled();
    expect(result).toEqual({
      admin: expect.objectContaining({
        id: '507f1f77bcf86cd799439012',
        tenantId: normalizedTenantId,
        email: normalizedEmail,
        name,
        role,
        passwordHash,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
      created: true,
    });
    expect(result.updated).toBeUndefined();
  });

  it('updates an existing admin with normalized inputs', async () => {
    const tenantId = '507F1F77BCF86CD799439011';
    const normalizedTenantId = '507f1f77bcf86cd799439011';
    const email = 'Admin@example.com';
    const normalizedEmail = 'admin@example.com';
    const name = 'Admin';
    const role = 'ADMIN';
    const passwordHash = 'hash';

    const findUnique = vi.fn().mockResolvedValue({
      id: '507F1F77BCF86CD799439012',
      tenantId,
      email: 'admin@example.com',
      name: 'Old Name',
      role: 'USER',
      passwordHash: 'old-hash',
    });
    const update = vi.fn().mockResolvedValue({
      id: '507F1F77BCF86CD799439012',
      tenantId: normalizedTenantId,
      email: normalizedEmail,
      name,
      role,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const create = vi.fn();

    const prisma = {
      user: {
        findUnique,
        update,
        create,

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

    expect(findUnique).toHaveBeenCalledWith({ where: { email: normalizedEmail } });
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { email: normalizedEmail },
      data: {
        tenantId: normalizedTenantId,
        email: normalizedEmail,

        name,
        role,
        passwordHash,
      },
    });
    expect(result).toEqual({
      admin: expect.objectContaining({
        id: '507f1f77bcf86cd799439012',
        tenantId: normalizedTenantId,
        email: normalizedEmail,
        name,
        role,
        passwordHash,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
      updated: true,
    });
    expect(result.created).toBeUndefined();
 main
  });
});
