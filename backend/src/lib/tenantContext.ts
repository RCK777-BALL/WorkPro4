import { prisma } from '../db';

export async function resolveTenantId(preferredTenantId?: string | null): Promise<string> {
  if (preferredTenantId && preferredTenantId.trim()) {
    return preferredTenantId.trim();
  }

  const tenant = await prisma.tenant.findFirst({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!tenant) {
    throw new Error('No tenant records are available. Seed the database to continue.');
  }

  return tenant.id;
}

export async function resolveTenantIdFromUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true },
  });

  if (user?.tenantId) {
    return user.tenantId;
  }

  return resolveTenantId();
}
