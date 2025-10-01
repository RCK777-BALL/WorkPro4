import { Prisma } from '@prisma/client';
import type { PrismaClient, Tenant, User } from '@prisma/client';

import { normalizeObjectId } from './normalizeObjectId';

export interface EnsureTenantResult {
  tenant: Tenant;
  created: boolean;
}

export async function ensureTenantNoTxn(prisma: PrismaClient, tenantName: string): Promise<EnsureTenantResult> {
  const slug = tenantName.toLowerCase().replace(/\s+/g, '-');
  let existing: Tenant | null = null;

  try {
    existing = await prisma.tenant.findUnique({ where: { slug } });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      (error.code !== 'P2032' && error.code !== 'P2023')
    ) {
      throw error;
    }
  }

  if (existing) {
    if (!existing.slug) {
      const updated = await prisma.tenant.update({
        where: { id: existing.id },
        data: { slug },
      });

      return { tenant: normalizeTenant(updated), created: false };
    }

    return { tenant: normalizeTenant(existing), created: false };
  }

  try {
    const tenant = await prisma.tenant.create({
      data: { name: tenantName, slug },
    });

    return { tenant: normalizeTenant(tenant), created: true };
  } catch (error) {
    throw error;
  }
}

export interface EnsureAdminOptions {
  prisma: PrismaClient;
  tenantId: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
}

export interface EnsureAdminResult {
  admin: User;
  created?: boolean;
  updated?: boolean;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeRole(role: string): string {
  const normalized = role.trim();

  if (!normalized) {
    return 'admin';
  }

  return normalized;
}

function normalizeTenant(tenant: Tenant): Tenant {
  return {
    ...tenant,
    id: normalizeObjectId(tenant.id, 'tenant.id'),
  };
}

function normalizeUser(user: User): User {
  return {
    ...user,
    id: normalizeObjectId(user.id, 'user.id'),
    tenantId: normalizeObjectId(user.tenantId, 'user.tenantId'),
  };
}

function ensureValidTenantId(tenantId: string): string {
  if (!tenantId) {
    throw new Error('Invalid tenantId provided to ensureAdminNoTxn');
  }

  return normalizeObjectId(tenantId, 'ensureValidTenantId.tenantId');
}

export async function ensureAdminNoTxn(options: EnsureAdminOptions): Promise<EnsureAdminResult> {
  const { prisma, tenantId, email, name, passwordHash, role } = options;
  const normalizedEmail = normalizeEmail(email);
  const normalizedTenantId = ensureValidTenantId(tenantId);
  const normalizedRole = normalizeRole(role);

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!existing) {
    const admin = await prisma.user.create({
      data: {
        tenantId: normalizedTenantId,
        email: normalizedEmail,
        name,
        role: normalizedRole,
        passwordHash,
      },
    });

    if (!admin.id) {
      throw new Error('Failed to create admin user: missing id in response.');
    }

    const normalizedAdmin = normalizeUser({
      ...admin,
      tenantId: normalizedTenantId,
      email: normalizedEmail,
      role: normalizedRole,
    });

    return {
      admin: normalizedAdmin,
      created: true,
    };
  }

  const admin = await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      tenantId: normalizedTenantId,
      email: normalizedEmail,
      name,
      role: normalizedRole,
      passwordHash,
    },
  });

  if (!admin.id) {
    throw new Error('Failed to update admin user: missing id in response.');
  }

  const normalizedAdmin = normalizeUser({
    ...admin,
    tenantId: normalizedTenantId,
    email: normalizedEmail,
    role: normalizedRole,
  });

  return {
    admin: normalizedAdmin,
    updated: true,
  };
}
