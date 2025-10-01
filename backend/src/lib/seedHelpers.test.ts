import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureTenantNoTxn } from './seedHelpers';

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
    public code: string;

    public clientVersion: string;

    constructor(message: string, options: { code: string; clientVersion: string }) {
      super(message);
      this.code = options.code;
      this.clientVersion = options.clientVersion;
    }
  }

  return { Prisma: { PrismaClientKnownRequestError } };
});

describe('ensureTenantNoTxn', () => {
  const findUnique = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const prisma = {
    tenant: {
      findUnique,
      create,
      update,
    },
  } as unknown as Parameters<typeof ensureTenantNoTxn>[0];

  beforeEach(() => {
    findUnique.mockReset();
    create.mockReset();
    update.mockReset();
  });

  it('creates a tenant with a slug when none exists', async () => {
    findUnique.mockResolvedValue(null);
    const createdTenant = {
      id: '507f1f77bcf86cd799439011',
      name: 'Demo Tenant',
      slug: 'demo-tenant',
    };
    create.mockResolvedValue(createdTenant);

    const result = await ensureTenantNoTxn(prisma, 'Demo Tenant');

    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'Demo Tenant',
        slug: 'demo-tenant',
      },
    });
    expect(result).toEqual({ tenant: createdTenant, created: true });
  });

  it('returns the existing tenant when it already has a slug', async () => {
    const existingTenant = {
      id: '507f1f77bcf86cd799439011',
      name: 'Demo Tenant',
      slug: 'demo-tenant',
    };
    findUnique.mockResolvedValue(existingTenant);

    const result = await ensureTenantNoTxn(prisma, 'Demo Tenant');

    expect(update).not.toHaveBeenCalled();
    expect(result).toEqual({ tenant: existingTenant, created: false });
  });

  it('adds a slug to an existing tenant when missing', async () => {
    const existingTenant = { id: '507f1f77bcf86cd799439011', name: 'Demo Tenant', slug: '' };
    const updatedTenant = { ...existingTenant, slug: 'demo-tenant' };
    findUnique.mockResolvedValue(existingTenant);
    update.mockResolvedValue(updatedTenant);

    const result = await ensureTenantNoTxn(prisma, 'Demo Tenant');

    expect(update).toHaveBeenCalledWith({
      where: { id: existingTenant.id },
      data: { slug: 'demo-tenant' },
    });
    expect(result).toEqual({ tenant: updatedTenant, created: false });

  });
});
