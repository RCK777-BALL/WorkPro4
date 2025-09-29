import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureTenantNoTxn } from './seedHelpers';

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
  const runCommandRaw = vi.fn();
  const prisma = {
    tenant: {
      findUnique,
      create,
      update,
    },
    $runCommandRaw: runCommandRaw,
  } as unknown as Parameters<typeof ensureTenantNoTxn>[0];

  beforeEach(() => {
    findUnique.mockReset();
    create.mockReset();
    update.mockReset();
    runCommandRaw.mockReset();
  });

  it('creates a tenant with a slug when none exists', async () => {
    findUnique.mockResolvedValue(null);
    const createdTenant = { id: 'tenant-1', name: 'Demo Tenant', slug: 'demo-tenant' };
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
    const existingTenant = { id: 'tenant-1', name: 'Demo Tenant', slug: 'demo-tenant' };
    findUnique.mockResolvedValue(existingTenant);

    const result = await ensureTenantNoTxn(prisma, 'Demo Tenant');

    expect(update).not.toHaveBeenCalled();
    expect(result).toEqual({ tenant: existingTenant, created: false });
  });

  it('adds a slug to an existing tenant when missing', async () => {
    const existingTenant = { id: 'tenant-1', name: 'Demo Tenant', slug: '' };
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

  it('falls back to a raw insert when create fails with P2031', async () => {
    const { Prisma } = await import('@prisma/client');
    const fallbackTenant = { id: 'tenant-1', name: 'Demo Tenant', slug: 'demo-tenant' };

    findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(fallbackTenant);
    create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('raw operation required', {
        code: 'P2031',
        clientVersion: 'test',
      }),
    );
    runCommandRaw.mockResolvedValueOnce({ ok: 1 });

    const result = await ensureTenantNoTxn(prisma, 'Demo Tenant');

    expect(runCommandRaw).toHaveBeenCalledWith({
      insert: 'tenants',
      documents: [{ name: 'Demo Tenant', slug: 'demo-tenant' }],
    });
    expect(result).toEqual({ tenant: fallbackTenant, created: true });
  });
});
