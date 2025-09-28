import bcrypt from '../lib/bcrypt';
import { loadEnv } from '../config/env';
import { prisma } from '../db';

async function main(): Promise<void> {
  loadEnv();
  await prisma.$connect();

  const tenantName = 'Demo Tenant';
  const adminEmail = 'admin@demo.com';
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const tenant =
    (await prisma.tenant.findUnique({ where: { name: tenantName } })) ??
    (await prisma.tenant.create({ data: { name: tenantName } }));

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Admin',
      roles: ['admin'],
      passwordHash,
      tenantId: tenant.id,
    },
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      name: 'Admin',
      roles: ['admin'],
      passwordHash,
    },
  });

  const existingWorkOrder = await prisma.workOrder.findFirst({
    where: {
      tenantId: tenant.id,
      title: 'Demo Work Order',
    },
  });

  if (existingWorkOrder) {
    console.log('[seed] demo work order already exists:', existingWorkOrder.id);
    return;
  }

  const workOrder = await prisma.workOrder.create({
    data: {
      tenantId: tenant.id,
      title: 'Demo Work Order',
      description: 'Inspect the demo asset and confirm it is running.',
      priority: 'medium',
      status: 'requested',
      assignees: [adminUser.id],
      createdBy: adminUser.id,
    },
  });

  console.log('[seed] tenant ready:', tenant.name);
  console.log('[seed] admin ready:', adminUser.email);
  console.log('[seed] work order created:', workOrder.id);
}

main()
  .catch((error) => {
    console.error('[seed] error', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
