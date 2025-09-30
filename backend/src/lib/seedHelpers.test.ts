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

vi.mock('@prisma/client', () => ({
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}));

import { ensureTenantNoTxn } from './seedHelpers';

describe('ensureTenantNoTxn', () => {
  const findFirst = vi.fn();
  const create = vi.fn();
  const prisma = {
    tenant: {
      findFirst,
      create,
    },
  } as unknown as Parameters<typeof ensureTenantNoTxn>[0];

  beforeEach(() => {
    findFirst.mockReset();
    create.mockReset();
  });

  it('creates a tenant when one does not exist', async () => {
    const createdTenant = { id: 'tenant-id', name: 'Demo Tenant' };
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue(createdTenant);

    const result = await ensureTenantNoTxn(prisma, 'Demo Tenant');

    expect(findFirst).toHaveBeenCalledWith({ where: { name: 'Demo Tenant' } });
    expect(create).toHaveBeenCalledWith({ data: { name: 'Demo Tenant' } });
    expect(result).toEqual({ tenant: createdTenant, created: true });
  });

  it('trims whitespace before querying and creating', async () => {
    const createdTenant = { id: 'tenant-id', name: 'Demo Tenant' };
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue(createdTenant);

    await ensureTenantNoTxn(prisma, '  Demo Tenant  ');

    expect(findFirst).toHaveBeenCalledWith({ where: { name: 'Demo Tenant' } });
    expect(create).toHaveBeenCalledWith({ data: { name: 'Demo Tenant' } });
  });

  it('returns the existing tenant when found', async () => {
    const existingTenant = { id: 'tenant-id', name: 'Existing Tenant' };
    findFirst.mockResolvedValue(existingTenant);

    const result = await ensureTenantNoTxn(prisma, 'Existing Tenant');

    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({ tenant: existingTenant, created: false });
  });
});
