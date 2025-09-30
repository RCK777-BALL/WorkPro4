import { Prisma } from '@prisma/client';
import type { PrismaClient, Tenant, User } from '@prisma/client';

import { normalizeObjectId } from './normalizeObjectId';

export interface EnsureTenantResult {
  tenant: Tenant;
  created: boolean;
}

async function backfillUserTimestamps(
  prisma: PrismaClient,
  now: Date,
  email?: string,

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
    ...(email ? { email } : {}),

    ...missingTimestampFilter,
  } satisfies Record<string, unknown>;

  const updateCommand = {
    update: 'users',

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
  const trimmed = tenantName.trim();
  let tenant = await prisma.tenant.findFirst({ where: { name: trimmed } });
  let created = false;

  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { name: trimmed } });
    created = true;
  }

  return { tenant, created };
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
