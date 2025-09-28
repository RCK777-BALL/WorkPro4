import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureTenantNoTxn } from './seedHelpers';

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
});
