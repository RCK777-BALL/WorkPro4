import { Prisma } from '@prisma/client';
import type { PrismaClient, Tenant, User } from '@prisma/client';
import type { ObjectId } from 'mongodb';

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

export interface EnsureAdminResult {
  admin: User;
  created: boolean;
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

type MongoUserDocument = {
  _id: ObjectId;
  tenantId?: string;
  tenant_id?: ObjectId | string;
  email: string;
  password_hash?: string;
  passwordHash?: string;
  name: string;
  role: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

interface UpsertUserRawArgs {
  tenantId: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
}

async function upsertUserRaw(
  prisma: PrismaClient,
  args: UpsertUserRawArgs,
): Promise<{ admin: User; created: boolean }> {
  const now = new Date();
  const normalizedTenantId = normalizeObjectId(args.tenantId, 'tenantId');
  const { email: normalizedEmail, name, passwordHash } = args;
  const role = normalizeRole(args.role);

  const command = {
    findAndModify: 'users',
    query: { email: normalizedEmail },
    update: {
      $set: {
        tenantId: normalizedTenantId,
        email: normalizedEmail,
        name,
        password_hash: passwordHash,
        role,
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

  const adminRole = normalizeRole(document.role ?? role);

  const admin: User = {
    id: normalizeObjectId(document._id, 'MongoUserDocument._id'),
    tenantId: normalizeObjectId(tenantIdSource, 'MongoUserDocument.tenant_id'),

    email: normalizedEmail,
    passwordHash: passwordHashSource,
    name: document.name,
    role: adminRole,
    createdAt: document.createdAt ? new Date(document.createdAt) : now,
    updatedAt: document.updatedAt ? new Date(document.updatedAt) : now,
  };

  const created = Boolean(result.lastErrorObject?.upserted) || result.lastErrorObject?.updatedExisting === false;

  return { admin: normalizeUser(admin), created };
}

export async function ensureAdminNoTxn(options: EnsureAdminOptions): Promise<EnsureAdminResult> {
  const { prisma, tenantId, email, name, passwordHash, role } = options;
  const normalizedEmail = normalizeEmail(email);
  const normalizedTenantId = ensureValidTenantId(tenantId);
  const normalizedRole = normalizeRole(role);


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
        role: normalizedRole,
      },
    );
  }

  if (!existing) {
    try {
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
              role: normalizedRole,
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
            role: normalizedRole,
          },
        );
      }

      throw error;
    }
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
    created: false,
  };
}
