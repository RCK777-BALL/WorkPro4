import { Prisma } from '@prisma/client';
import type { PrismaClient, Tenant, User } from '@prisma/client';
import { ObjectId } from 'mongodb';

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
  roles: string[];
}

export interface EnsureAdminResult {
  admin: User;
  created: boolean;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeRoles(roles: string[]): string[] {
  const sanitized = roles.map((value) => value.trim()).filter((value) => value.length > 0);

  if (sanitized.length === 0) {
    return ['admin'];
  }

  return Array.from(new Set(sanitized));
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

async function applyRoles(
  prisma: PrismaClient,
  userId: string,
  roles: string[],
  primaryRole: string,
): Promise<void> {
  await prisma.$runCommandRaw({
    update: 'users',
    updates: [
      {
        q: { _id: new ObjectId(userId) },
        u: {
          $set: {
            roles,
            role: primaryRole,
          },
        },
        multi: false,
      },
    ],
  } as Prisma.InputJsonObject);
}

type MongoUserDocument = {
  _id: ObjectId;
  tenantId?: string;
  tenant_id?: ObjectId | string;
  email: string;
  password_hash?: string;
  passwordHash?: string;
  name: string;
  role: string;
  roles?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

interface UpsertUserRawArgs {
  tenantId: string;
  email: string;
  name: string;
  passwordHash: string;
  roles: string[];
}

async function upsertUserRaw(
  prisma: PrismaClient,
  args: UpsertUserRawArgs,
  primaryRole: string,
): Promise<{ admin: User; created: boolean }> {
  const now = new Date();
  const normalizedTenantId = normalizeObjectId(args.tenantId, 'tenantId');
  const { email: normalizedEmail, name, passwordHash, roles } = args;

  const command = {
    findAndModify: 'users',
    query: { email: normalizedEmail },
    update: {
      $set: {
        tenantId: normalizedTenantId,
        email: normalizedEmail,
        name,
        password_hash: passwordHash,
        roles,
        role: primaryRole,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    upsert: true,
    new: true,
  } satisfies Record<string, unknown>;

  const result = (await prisma.$runCommandRaw(command as Prisma.InputJsonObject)) as {
    value?: MongoUserDocument | null;
    lastErrorObject?: { upserted?: ObjectId; updatedExisting?: boolean };
  };

  const document = result.value;

  if (!document) {
    throw new Error('Failed to upsert admin user document.');
  }

  const tenantIdSource = document.tenantId ?? document.tenant_id ?? normalizedTenantId;
  const passwordHashSource = document.password_hash ?? document.passwordHash ?? passwordHash;

  const admin: User = {
    id: normalizeObjectId(document._id, 'MongoUserDocument._id'),
    tenantId: normalizeObjectId(document.tenant_id, 'MongoUserDocument.tenant_id'),

    email: normalizedEmail,
    passwordHash: passwordHashSource,
    name: document.name,
    role: document.role,
    roles: document.roles ?? roles,
    createdAt: document.createdAt ? new Date(document.createdAt) : now,
    updatedAt: document.updatedAt ? new Date(document.updatedAt) : now,
  };

  const created = Boolean(result.lastErrorObject?.upserted) || result.lastErrorObject?.updatedExisting === false;

  return { admin: normalizeUser(admin), created };
}

export async function ensureAdminNoTxn(options: EnsureAdminOptions): Promise<EnsureAdminResult> {
  const { prisma, tenantId, email, name, passwordHash, roles } = options;
  const normalizedEmail = normalizeEmail(email);
  const normalizedRoles = normalizeRoles(roles);
  const primaryRole = normalizedRoles[0];
  const normalizedTenantId = ensureValidTenantId(tenantId);


  let existing: User | null = null;
  let encounteredKnownError = false;

  try {
    existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2032' || error.code === 'P2023')
    ) {
      encounteredKnownError = true;
      const now = new Date();

      await backfillUserTimestamps(prisma, now, normalizedEmail);
    } else {
      throw error;
    }
  }

  if (encounteredKnownError) {
    return upsertUserRaw(
      prisma,
      {
        tenantId: normalizedTenantId,
        email: normalizedEmail,
        name,
        passwordHash,
        roles: normalizedRoles,
      },
      primaryRole,
    );
  }

  if (!existing) {
    try {
      const admin = await prisma.user.create({
        data: {
          tenant: { connect: { id: normalizedTenantId } },
          email: normalizedEmail,
          name,
          roles: normalizedRoles,

          passwordHash,
        },
      });

      const normalizedAdmin = normalizeUser({
        ...admin,
        tenantId: normalizedTenantId,
        email: normalizedEmail,
        roles: normalizedRoles,
      });

      await applyRoles(prisma, normalizedAdmin.id, normalizedRoles, primaryRole);

      return {
        admin: normalizedAdmin,
        created: true,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2031') {
        const now = new Date();

        await prisma.$runCommandRaw({
          insert: 'users',
          documents: [
            {
              tenantId: normalizedTenantId,
              email: normalizedEmail,
              name,
              roles: normalizedRoles,
              passwordHash,

              createdAt: now,
              updatedAt: now,
            },
          ],
        } as Prisma.InputJsonObject);

        await backfillUserTimestamps(prisma, now, normalizedEmail);

        return upsertUserRaw(
          prisma,
          {
            tenantId: normalizedTenantId,
            email: normalizedEmail,
            name,
            passwordHash,
            roles: normalizedRoles,
          },
          primaryRole,
        );
      }

      throw error;
    }
  }

  const admin = await prisma.user.update({
    where: { id: existing.id },
    data: {
      tenant: { connect: { id: normalizedTenantId } },
      email: normalizedEmail,
      name,
      roles: normalizedRoles,

      passwordHash,
    },
  });

  const normalizedAdmin = normalizeUser({
    ...admin,
    tenantId: normalizedTenantId,
    email: normalizedEmail,
    roles: normalizedRoles,
  });

  await applyRoles(prisma, normalizedAdmin.id, normalizedRoles, primaryRole);

  return {
    admin: normalizedAdmin,
    created: false,
  };
}
