import { Prisma } from '@prisma/client';
import type { Tenant, User } from '@prisma/client';

import bcrypt from '../lib/bcrypt';
import { loadEnv } from '../config/env';
import { prisma } from '../db';

async function main(): Promise<void> {
  loadEnv();
  await prisma.$connect();

  const tenantName = 'Demo Tenant';
  const adminEmail = 'admin@demo.com';
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const { tenant, created: tenantCreated } = await ensureTenantNoTxn(tenantName);
  const {
    user: adminUser,
    created: adminCreated,
    updated: adminUpdated,
  } = await ensureAdminNoTxn({
    email: adminEmail,
    name: 'Admin',
    passwordHash,
    role: 'admin',
    tenantId: tenant.id,

  });

  const workOrderTitle = 'Demo Work Order';
  const existingWorkOrder = await prisma.workOrder.findFirst({
    where: {
      tenantId: tenant.id,
      title: workOrderTitle,
    },
  });

  let workOrderCreated = false;
  let workOrder = existingWorkOrder;

  if (!workOrder) {
    workOrder = await prisma.workOrder.create({
      data: {
        tenantId: tenant.id,
        title: workOrderTitle,
        description: 'Inspect the demo asset and confirm it is running.',
        priority: 'medium',
        status: 'requested',
        assignees: [adminUser.id],
        createdBy: adminUser.id,
      },
    });
    workOrderCreated = true;
  }

  if (tenantCreated) {
    console.log('✅ Created demo tenant:', tenant.name);
  } else {
    console.log('ℹ️ Demo tenant already exists:', tenant.name);
  }

  if (adminCreated) {
    console.log('✅ Created demo admin user:', adminUser.email);
  } else if (adminUpdated) {
    console.log('♻️ Updated demo admin user:', adminUser.email);
  } else {
    console.log('ℹ️ Demo admin user already up to date:', adminUser.email);
  }

  if (workOrderCreated) {
    console.log('✅ Created demo work order:', workOrder.title);
  } else {
    console.log('ℹ️ Demo work order already exists:', workOrder.title);
  }

  console.log('Demo login credentials:');
  console.log('  • admin@demo.com / Admin@123');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function ensureTenantNoTxn(tenantName: string): Promise<{ tenant: Tenant; created: boolean }> {
  const slug = tenantName.toLowerCase().replace(/\s+/g, '-');
  const existingTenant = await prisma.tenant.findUnique({ where: { slug } });

  if (existingTenant) {
    if (!existingTenant.slug) {
      const updatedTenant = await prisma.tenant.update({
        where: { id: existingTenant.id },
        data: { slug },
      });

      return { tenant: updatedTenant, created: false };
    }

    return { tenant: existingTenant, created: false };
  }

  try {
    const tenant = await prisma.tenant.create({
      data: { name: tenantName, slug },
    });

    return { tenant, created: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2031') {
      await prisma.$runCommandRaw({
        insert: 'tenants',
        documents: [{ name: tenantName, slug }],
      });

      const tenant = await prisma.tenant.findUnique({ where: { slug } });

      if (tenant) {
        return { tenant, created: true };
      }
    }

    throw error;
  }
}

type EnsureAdminParams = {
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  tenantId: string;
};

type EnsureAdminResult = {
  user: User;
  created: boolean;
  updated: boolean;
};

async function ensureAdminNoTxn(params: EnsureAdminParams): Promise<EnsureAdminResult> {
  const { email, name, passwordHash, role, tenantId } = params;
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (!existingUser) {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        tenantId,
      },
    });

    return { user, created: true, updated: false } as const;
  }

  const needsNameUpdate = existingUser.name !== name;
  const needsRoleUpdate = existingUser.role !== role;
  const needsPasswordUpdate = existingUser.passwordHash !== passwordHash;
  const needsTenantUpdate = existingUser.tenantId !== tenantId;

  if (!needsNameUpdate && !needsRoleUpdate && !needsPasswordUpdate && !needsTenantUpdate) {
    return { user: existingUser, created: false, updated: false } as const;
  }

  const user = await prisma.user.update({
    where: { email },
    data: {
      name,
      role,
      passwordHash,
      tenantId,
    },
  });

  return { user, created: false, updated: true } as const;
}
