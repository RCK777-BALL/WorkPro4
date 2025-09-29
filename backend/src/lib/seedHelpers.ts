import { Prisma } from '@prisma/client';
import type { PrismaClient, Tenant, User } from '@prisma/client';

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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2032') {
      const now = new Date();

      await prisma.$runCommandRaw({
        update: 'tenants',
        updates: [
          {
            q: {
              slug,
              $or: [
                { createdAt: { $exists: false } },
                { updatedAt: { $exists: false } },
              ],
            },
            u: {
              $set: {
                createdAt: now,
                updatedAt: now,
              },
            },
            upsert: false,
            multi: true,
          },
        ],
      });

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

      await prisma.$runCommandRaw({
        update: 'tenants',
        updates: [
          {
            q: {
              $or: [
                { createdAt: { $exists: false } },
                { updatedAt: { $exists: false } },
              ],
            },
            u: {
              $set: {
                createdAt: now,
                updatedAt: now,
              },
            },
            upsert: false,
            multi: true,
          },
        ],
      });

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

  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
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
