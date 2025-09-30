import { Prisma } from '@prisma/client';
import type { PrismaClient, Tenant, User } from '@prisma/client';
import { ObjectId } from 'mongodb';

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

      return { tenant: updated, created: false };
    }

    return { tenant: existing, created: false };
  }

  try {
    const tenant = await prisma.tenant.create({
      data: { name: tenantName, slug },
    });

    return { tenant, created: true };
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
        return { tenant, created: true };
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

export interface EnsureAdminResult {
  admin: User;
  created: boolean;
}

export async function ensureAdminNoTxn(options: EnsureAdminOptions): Promise<EnsureAdminResult> {
  const { prisma, tenantId, email, name, passwordHash, role } = options;

  let existing: User | null = null;

  try {
    existing = await prisma.user.findUnique({ where: { email } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2032' || error.code === 'P2023')
    ) {
      const now = new Date();

      await backfillUserTimestamps(prisma, now, email);

      existing = await prisma.user.findUnique({ where: { email } });
    } else {
      throw error;
    }
  }

  if (!existing) {
    try {
      const admin = await prisma.user.create({
        data: {
          tenantId,
          email,
          name,
          role,
          passwordHash,
        },
      });

      return { admin, created: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2031') {
        const now = new Date();

        await prisma.$runCommandRaw({
          insert: 'users',
          documents: [
            {
              tenantId: new ObjectId(tenantId),
              email,
              name,
              role,
              passwordHash,
              createdAt: now,
              updatedAt: now,
            },
          ],
        } as Prisma.InputJsonObject);

        await backfillUserTimestamps(prisma, now, email);

        const admin = await prisma.user.findUnique({ where: { email } });

        if (admin) {
          return { admin, created: true };
        }

        throw new Error('Admin not found after manual insert.');
      }

      throw error;
    }
  }

  const admin = await prisma.user.update({
    where: { email },
    data: {
      tenantId,
      name,
      role,
      passwordHash,
    },
  });

  return { admin, created: false };
}
