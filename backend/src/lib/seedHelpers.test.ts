import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient, User } from '@prisma/client';

import { ensureAdminNoTxn } from './seedHelpers';

describe('ensureAdminNoTxn', () => {
  it('creates an admin when no user exists', async () => {
    const createdAdmin = {
      id: 'admin-id',
      tenantId: 'tenant-123',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin',
      passwordHash: 'hashed-password',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    } as unknown as User;

    const userModel = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(createdAdmin),
      update: vi.fn(),
    };

    const prisma = { user: userModel } as unknown as PrismaClient;

    const result = await ensureAdminNoTxn({
      prisma,
      tenantId: 'tenant-123',
      email: 'admin@example.com',
      name: 'Admin',
      passwordHash: 'hashed-password',
      role: 'admin',
    });

    expect(userModel.findUnique).toHaveBeenCalledWith({ where: { email: 'admin@example.com' } });
    expect(userModel.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-123',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin',
        passwordHash: 'hashed-password',
      },
    });
    expect(userModel.update).not.toHaveBeenCalled();
    expect(result).toEqual({ admin: createdAdmin, created: true });
  });

  it('updates an existing admin when a user is found', async () => {
    const existingAdmin = {
      id: 'admin-id',
      tenantId: 'tenant-123',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin',
      passwordHash: 'old-hash',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    } as unknown as User;

    const updatedAdmin = {
      ...existingAdmin,
      passwordHash: 'new-hash',
      updatedAt: new Date('2024-01-03T00:00:00.000Z'),
    } as User;

    const userModel = {
      findUnique: vi.fn().mockResolvedValue(existingAdmin),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(updatedAdmin),
    };

    const prisma = { user: userModel } as unknown as PrismaClient;

    const result = await ensureAdminNoTxn({
      prisma,
      tenantId: 'tenant-123',
      email: 'admin@example.com',
      name: 'Admin',
      passwordHash: 'new-hash',
      role: 'admin',
    });

    expect(userModel.findUnique).toHaveBeenCalledWith({ where: { email: 'admin@example.com' } });
    expect(userModel.create).not.toHaveBeenCalled();
    expect(userModel.update).toHaveBeenCalledWith({
      where: { email: 'admin@example.com' },
      data: {
        tenantId: 'tenant-123',
        name: 'Admin',
        role: 'admin',
        passwordHash: 'new-hash',
      },
    });
    expect(result).toEqual({ admin: updatedAdmin, created: false });
  });
});
