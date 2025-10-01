import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const bcryptMocks = vi.hoisted(() => {
  const hash = vi.fn();
  const hashSync = vi.fn();
  const compare = vi.fn();
  const compareSync = vi.fn();
  return { hash, hashSync, compare, compareSync };
});

vi.mock('./bcrypt', () => ({
  default: bcryptMocks,
  ...bcryptMocks,
}));

const { hash, hashSync, compare, compareSync } = bcryptMocks;

import type { PrismaClient } from '@prisma/client';

import { ensureAdminNoTxn, ensureTenantNoTxn } from './seedHelpers';

describe('ensureTenantNoTxn', () => {
  let findUnique: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let prisma: PrismaClient;

  beforeEach(() => {
    findUnique = vi.fn();
    update = vi.fn();
    create = vi.fn();

    prisma = {
      tenant: {
        findUnique,
        update,
        create,
      },
    } as unknown as PrismaClient;
  });

  it('returns an existing tenant when it already has a slug', async () => {
    const tenantName = 'Acme Corp';
    const slug = 'acme-corp';
    const tenant = {
      id: '507F1F77BCF86CD799439011',
      name: tenantName,
      slug,
    };

    findUnique.mockResolvedValue(tenant);

    const result = await ensureTenantNoTxn(prisma, tenantName);

    expect(findUnique).toHaveBeenCalledWith({ where: { slug } });
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({
      tenant: { id: '507f1f77bcf86cd799439011', name: tenantName, slug },
      created: false,
    });
  });

  it('adds a slug to an existing tenant when missing', async () => {
    const tenantName = 'Acme Corp';
    const slug = 'acme-corp';
    const tenant = {
      id: '507F1F77BCF86CD799439011',
      name: tenantName,
      slug: '',
    };
    const updatedTenant = { ...tenant, slug };

    findUnique.mockResolvedValue(tenant);
    update.mockResolvedValue(updatedTenant);

    const result = await ensureTenantNoTxn(prisma, tenantName);

    expect(findUnique).toHaveBeenCalledWith({ where: { slug } });
    expect(update).toHaveBeenCalledWith({
      where: { id: tenant.id },
      data: { slug },
    });
    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({
      tenant: { id: '507f1f77bcf86cd799439011', name: tenantName, slug },
      created: false,
    });
  });

  it('creates a tenant when none exists', async () => {
    const tenantName = 'New Tenant';
    const slug = 'new-tenant';
    const createdTenant = {
      id: '507F1F77BCF86CD799439012',
      name: tenantName,
      slug,
    };

    findUnique.mockResolvedValue(null);
    create.mockResolvedValue(createdTenant);

    const result = await ensureTenantNoTxn(prisma, `  ${tenantName}  `);

    expect(findUnique).toHaveBeenCalledWith({ where: { slug } });
    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({
      data: { name: tenantName, slug },
    });
    expect(result).toEqual({
      tenant: { id: '507f1f77bcf86cd799439012', name: tenantName, slug },
      created: true,
    });
  });
});

describe('ensureAdminNoTxn', () => {
  beforeEach(() => {
    hash.mockReset();
    hashSync.mockReset();
    compare.mockReset();
    compareSync.mockReset();
  });

  it('creates an admin when none exists with normalized inputs', async () => {
    const tenantId = '507F1F77BCF86CD799439011';
    const email = ' Admin@example.com ';
    const name = 'Admin User';
    const password = 'Password123!';
    const role = ' admin ';
    const hashed = 'derived-hash';

    hash.mockResolvedValueOnce(hashed);

    const findUnique = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({
      id: '507F1F77BCF86CD799439012',
      tenantId,
      email,
      name,
      role,
      passwordHash: hashed,
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
      password,
      role,
    });

    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'admin@example.com' } });
    expect(hash).toHaveBeenCalledWith(password, 10);
    expect(compare).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        name,
        role: 'admin',
        passwordHash: hashed,
      },
    });
    expect(update).not.toHaveBeenCalled();
    expect(result).toEqual({
      admin: expect.objectContaining({
        id: '507f1f77bcf86cd799439012',
        tenantId: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        name,
        role: 'admin',
        passwordHash: hashed,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
      created: true,
      updated: false,
    });
  });

  it('updates an existing admin when fields change', async () => {
    const tenantId = '507F1F77BCF86CD799439011';
    const email = 'Admin@example.com';
    const name = 'Admin User';
    const password = 'Password123!';
    const role = 'ADMIN';
    const newHash = 'new-hash';

    compare.mockResolvedValueOnce(false);
    hash.mockResolvedValueOnce(newHash);

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
      tenantId,
      email: 'admin@example.com',
      name,
      role,
      passwordHash: newHash,
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
      password,
      role,
    });

    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'admin@example.com' } });
    expect(compare).toHaveBeenCalledWith(password, 'old-hash');
    expect(hash).toHaveBeenCalledWith(password, 10);
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: '507F1F77BCF86CD799439012' },
      data: {
        name,
        role: 'ADMIN',
        passwordHash: newHash,
      },
    });
    expect(result).toEqual({
      admin: expect.objectContaining({
        id: '507f1f77bcf86cd799439012',
        tenantId: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        name,
        role: 'ADMIN',
        passwordHash: newHash,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
      created: false,
      updated: true,
    });
  });

  it('short-circuits when the existing admin matches expectations', async () => {
    const tenantId = '507F1F77BCF86CD799439011';
    const email = 'admin@example.com';
    const name = 'Admin User';
    const password = 'Password123!';
    const role = 'admin';

    compare.mockResolvedValueOnce(true);

    const existing = {
      id: '507F1F77BCF86CD799439012',
      tenantId,
      email,
      name,
      role,
      passwordHash: 'stored-hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const findUnique = vi.fn().mockResolvedValue(existing);
    const update = vi.fn();
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
      password,
      role,
    });

    expect(findUnique).toHaveBeenCalledWith({ where: { email } });
    expect(compare).toHaveBeenCalledWith(password, 'stored-hash');
    expect(hash).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(result).toEqual({
      admin: expect.objectContaining({
        id: '507f1f77bcf86cd799439012',
        tenantId: '507f1f77bcf86cd799439011',
        email,
        name,
        role,
        passwordHash: 'stored-hash',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
      created: false,
      updated: false,
    });
  });
});

