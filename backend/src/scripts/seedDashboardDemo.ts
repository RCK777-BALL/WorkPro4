import crypto from 'crypto';
import { addDays, subDays } from 'date-fns';
import { prisma } from '../db';

function objectId(): string {
  return crypto.randomBytes(12).toString('hex');
}

function randomChoice<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function ensureTenant() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'workpro-demo' },
    update: {},
    create: {
      name: 'WorkPro Demo Plant',
      slug: 'workpro-demo',
    },
  });

  return tenant.id;
}

async function ensureUsers(tenantId: string) {
  const roles = [
    { role: 'admin', email: 'admin@workpro.demo' },
    { role: 'manager', email: 'manager@workpro.demo' },
    { role: 'planner', email: 'planner@workpro.demo' },
    { role: 'technician', email: 'tech@workpro.demo' },
  ];

  const users = [] as Array<{ id: string; role: string }>;

  for (const entry of roles) {
    const user = await prisma.user.upsert({
      where: { email: entry.email },
      update: {},
      create: {
        tenantId,
        email: entry.email,
        passwordHash: '$2a$10$uLnyu6HwZ7q9x8B2P/6S/OH5y7HxVn9Yx8aEXAMPLEbQ0w8WcN',
        name: entry.email.split('@')[0]!.replace(/\b\w/g, (c) => c.toUpperCase()),
        role: entry.role,
      },
    });

    users.push({ id: user.id, role: entry.role });
  }

  return users;
}

async function seedAssets(tenantId: string, siteIds: string[], lineIds: string[]) {
  const categories = ['Packaging', 'Processing', 'Utilities', 'Material Handling'];
  const statuses = ['operational', 'maintenance', 'down'] as const;
  const assets: Array<{ id: string; tenantId: string }> = [];

  for (let i = 0; i < 200; i += 1) {
    const asset = await prisma.asset.create({
      data: {
        tenantId,
        siteId: randomChoice(siteIds),
        lineId: randomChoice(lineIds),
        code: `AST-${(i + 1).toString().padStart(4, '0')}`,
        name: `Asset ${(i + 1).toString().padStart(3, '0')}`,
        category: randomChoice(categories),
        status: randomChoice(statuses),
        location: `Zone ${randomInt(1, 12)}`,
      },
    });

    assets.push({ id: asset.id, tenantId });
  }

  return assets;
}

function buildWorkOrders(
  tenantId: string,
  assets: Array<{ id: string }>,
  siteIds: string[],
  lineIds: string[],
  users: Array<{ id: string; role: string }>,
) {
  const priorities = ['low', 'medium', 'high', 'urgent'] as const;
  const statuses = ['requested', 'assigned', 'in_progress', 'completed', 'cancelled'] as const;
  const now = new Date();
  const data: any[] = [];

  for (let i = 0; i < 2000; i += 1) {
    const createdAt = subDays(now, randomInt(0, 90));
    const status = randomChoice(statuses);
    const priority = randomChoice(priorities);
    const assignee = Math.random() < 0.7 ? randomChoice(users) : null;
    const asset = randomChoice(assets);
    const isPreventive = Math.random() < 0.35;
    const dueDate = addDays(createdAt, randomInt(1, 21));
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;
    let timeSpentMin: number | null = null;

    if (status === 'in_progress' || status === 'completed') {
      startedAt = addDays(createdAt, randomInt(0, 5));
      timeSpentMin = randomInt(45, 480);
    }

    if (status === 'completed') {
      const minutes = timeSpentMin ?? randomInt(30, 480);
      completedAt = new Date(startedAt ? startedAt.getTime() + minutes * 60000 : createdAt.getTime());
    }

    data.push({
      tenantId,
      siteId: randomChoice(siteIds),
      lineId: randomChoice(lineIds),
      assetId: asset.id,
      title: `${isPreventive ? 'PM' : 'WO'} #${i + 1}`,
      description: isPreventive ? 'Scheduled preventive maintenance task.' : 'Corrective maintenance task.',
      priority,
      status,
      assigneeId: assignee?.id ?? null,
      createdBy: users[0]!.id,
      dueDate,
      createdAt,
      updatedAt: status === 'completed' ? completedAt ?? addDays(createdAt, 2) : addDays(createdAt, randomInt(1, 7)),
      startedAt,
      completedAt,
      timeSpentMin,
      isPreventive,
    });
  }

  return data;
}

function buildDowntimeLogs(
  tenantId: string,
  assets: Array<{ id: string; tenantId: string }>,
  siteIds: string[],
  lineIds: string[],
) {
  const logs: any[] = [];
  const now = new Date();

  for (const asset of assets) {
    const entryCount = randomInt(0, 5);

    for (let i = 0; i < entryCount; i += 1) {
      const start = subDays(now, randomInt(0, 45));
      const minutes = randomInt(15, 480);
      logs.push({
        tenantId,
        assetId: asset.id,
        siteId: randomChoice(siteIds),
        lineId: randomChoice(lineIds),
        startedAt: start,
        endedAt: new Date(start.getTime() + minutes * 60000),
        minutes,
      });
    }
  }

  return logs;
}

function buildParts(tenantId: string, siteIds: string[]) {
  const parts: any[] = [];

  for (let i = 0; i < 180; i += 1) {
    const minLevel = randomInt(1, 20);
    const onHand = randomInt(0, 40);

    parts.push({
      tenantId,
      siteId: randomChoice(siteIds),
      name: `Part ${(i + 1).toString().padStart(3, '0')}`,
      sku: `SKU-${(i + 1).toString().padStart(5, '0')}`,
      minLevel,
      onHand,
      cost: Number((Math.random() * 500).toFixed(2)),
    });
  }

  return parts;
}

async function main() {
  const tenantId = await ensureTenant();
  const users = await ensureUsers(tenantId);
  const siteIds = Array.from({ length: 4 }, () => objectId());
  const lineIds = Array.from({ length: 6 }, () => objectId());

  console.log('🌱 Seeding assets...');
  const assets = await seedAssets(tenantId, siteIds, lineIds);

  console.log('🌱 Seeding work orders...');
  const workOrders = buildWorkOrders(tenantId, assets, siteIds, lineIds, users);
  await prisma.workOrder.createMany({ data: workOrders });

  console.log('🌱 Seeding downtime logs...');
  const downtimeLogs = buildDowntimeLogs(tenantId, assets, siteIds, lineIds);
  if (downtimeLogs.length) {
    await prisma.downtimeLog.createMany({ data: downtimeLogs });
  }

  console.log('🌱 Seeding parts...');
  const parts = buildParts(tenantId, siteIds);
  await prisma.part.createMany({ data: parts });

  console.log('✅ Dashboard demo data ready');
}

main()
  .catch((error) => {
    console.error('❌ Failed to seed dashboard demo data', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
