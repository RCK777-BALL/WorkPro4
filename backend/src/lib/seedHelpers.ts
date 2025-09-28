import type { PrismaClient, Tenant, User } from '@prisma/client';

export interface EnsureTenantResult {
  tenant: Tenant;
  created: boolean;
}

export async function ensureTenantNoTxn(prisma: PrismaClient, tenantName: string): Promise<EnsureTenantResult> {
  const slug = tenantName.toLowerCase().replace(/\s+/g, '-');
  const existing = await prisma.tenant.findUnique({ where: { name: tenantName } });

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

  const tenant = await prisma.tenant.create({
    data: { name: tenantName, slug },
  });

  return { tenant, created: true };
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

export async function ensureAdminNoTxn(options: EnsureAdminOptions): Promise<EnsureAdminResult> {
  const { prisma, tenantId, email, name, passwordHash, roles } = options;

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      tenantId,
      name,
      roles,
      passwordHash,
    },
    create: {
      tenantId,
      email,
      name,
      roles,
      passwordHash,
    },
  });

  const created = admin.createdAt.getTime() === admin.updatedAt.getTime();
  return { admin, created };
}
