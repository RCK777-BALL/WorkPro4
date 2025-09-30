import { Prisma } from '@prisma/client';
import type { PrismaClient, Tenant, User } from '@prisma/client';

import { normalizeObjectId } from './normalizeObjectId';

export interface EnsureTenantResult {
  tenant: Tenant;
  created: boolean;
}

async function backfillTenantTimestamps(
  prisma: PrismaClient,
  now: Date,
  slug?: string,
): Promise<void> {
  const missingTimestampFilter = {
    $or: [
      { createdAt: { $exists: false } },
      { createdAt: { $type: 10 } },
      { createdAt: { $type: 'string' } },
      { updatedAt: { $exists: false } },
      { updatedAt: { $type: 10 } },
      { updatedAt: { $type: 'string' } },
    ],
  } satisfies Record<string, unknown>;

  const query = {
    ...(slug ? { slug } : {}),
    ...missingTimestampFilter,
  } satisfies Record<string, unknown>;

  const updateCommand = {
    update: 'tenants',
    updates: [
      {
        q: query,
        u: [
          {
            $set: {
              createdAt: {
                $cond: [
                  { $eq: [{ $type: '$createdAt' }, 'string'] },
                  { $toDate: '$createdAt' },
                  { $ifNull: ['$createdAt', now] },
                ],
              },
              updatedAt: {
                $cond: [
                  { $eq: [{ $type: '$updatedAt' }, 'string'] },
                  { $toDate: '$updatedAt' },
                  { $ifNull: ['$updatedAt', now] },
                ],
              },
            },
          },
        ],
        multi: true,
      },
    ],
  } satisfies Record<string, unknown>;

  await prisma.$runCommandRaw(updateCommand as Prisma.InputJsonObject);
}

export async function ensureTenantNoTxn(prisma: PrismaClient, tenantName: string): Promise<EnsureTenantResult> {
  const slug = tenantName.toLowerCase().replace(/\s+/g, '-');
  let existing: Tenant | null = null;

  try {
    existing = await prisma.tenant.findUnique({ where: { slug } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2032' || error.code === 'P2023')
    ) {
      const now = new Date();

      await backfillTenantTimestamps(prisma, now, slug);


      existing = await prisma.tenant.findUnique({ where: { slug } });
    } else {
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2031') {
      const now = new Date();
      await prisma.$runCommandRaw({
        insert: 'tenants',
        documents: [
          {
            name: tenantName,
            slug,
            createdAt: now,
            updatedAt: now,
          },
        ],
      });

      await backfillTenantTimestamps(prisma, now);


      const tenant = await prisma.tenant.findUnique({ where: { slug } });

      if (tenant) {
        return { tenant: normalizeTenant(tenant), created: true };
      }
    }

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

export type EnsureAdminResult =
  | { admin: User; created: true }
  | { admin: User; updated: true };

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

export async function ensureAdminNoTxn(options: EnsureAdminOptions): Promise<EnsureAdminResult> {
  const { prisma, tenantId, email, name, passwordHash, role } = options;

  if (!tenantId) {
    throw new Error('Invalid tenantId provided to ensureAdminNoTxn');
  }

  const normalizedTenantId = normalizeObjectId(tenantId, 'ensureAdminNoTxn.tenantId');
  const normalizedEmail = normalizeEmail(email);
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

    const normalizedAdmin = normalizeUser({
      ...admin,
      tenantId: normalizedTenantId,
      email: normalizedEmail,
      role: normalizedRole,
    });

    return { admin: normalizedAdmin, created: true };
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

  const normalizedAdmin = normalizeUser({
    ...admin,
    tenantId: normalizedTenantId,
    email: normalizedEmail,
    role: normalizedRole,
  });

  return { admin: normalizedAdmin, updated: true };
}
