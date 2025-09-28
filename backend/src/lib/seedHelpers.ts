import type { PrismaClient, Tenant, User } from '@prisma/client';

export interface EnsureTenantResult {
  tenant: Tenant;
  created: boolean;
}

export async function ensureTenantNoTxn(prisma: PrismaClient, tenantName: string): Promise<EnsureTenantResult> {
  const existing = await prisma.tenant.findUnique({ where: { name: tenantName } });
  if (existing) {
    return { tenant: existing, created: false };
  }

  const tenant = await prisma.tenant.create({ data: { name: tenantName } });
  return { tenant, created: true };
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
