import { Prisma } from '@prisma/client';
import type { Asset, Tenant, User } from '@prisma/client';

import bcrypt from '../lib/bcrypt';
import { loadEnv } from '../config/env';
import { prisma } from '../db';
import { normalizeObjectId } from '../lib/normalizeObjectId';
import type { NormalizableObjectId } from '../lib/normalizeObjectId';

async function main(): Promise<void> {
  loadEnv();
  await prisma.$connect();

  const tenantName = 'Demo Tenant';
  const adminEmail = 'admin@demo.com';
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const { tenant, created: tenantCreated } = await ensureTenantNoTxn(tenantName);
  const normalizedTenantId = normalizeObjectId(tenant.id, 'tenant.id');
  const {
    user: adminUser,
    created: adminCreated,
    updated: adminUpdated,
  } = await ensureAdminNoTxn({
    email: adminEmail,
    name: 'Admin',
    passwordHash,
    role: 'admin',
    tenantId: normalizedTenantId,

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
        assigneeId: adminUser.id,
        createdBy: adminUser.id,

      },
    });
    workOrderCreated = true;
  }

  const hierarchy = await seedDemoHierarchy({ tenantId: tenant.id });

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
    if (hierarchy.asset) {
      await prisma.workOrder.update({
        where: { id: workOrder.id },
        data: { assetId: hierarchy.asset.id },
      });
    }

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
  tenantId: NormalizableObjectId;

};

type EnsureAdminResult = {
  user: User;
  created: boolean;
  updated: boolean;
};

function assertUserHasId(
  user: Pick<User, 'id'> | null | undefined,
  context: string,
): asserts user is Pick<User, 'id'> & { id: string } {
  if (!user || !user.id) {
    throw new Error(`Prisma returned a user without an id while ${context}.`);
  }
}

async function ensureAdminNoTxn(params: EnsureAdminParams): Promise<EnsureAdminResult> {
  const { email, name, passwordHash, role, tenantId } = params;
  const normalizedTenantId = normalizeObjectId(tenantId, 'ensureAdminNoTxn.tenantId');

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (!existingUser) {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        tenantId: normalizedTenantId,

      },
    });

    assertUserHasId(user, 'creating the admin user');

    return { user, created: true, updated: false } as const;
  }

  const needsNameUpdate = existingUser.name !== name;
  const needsPasswordUpdate = existingUser.passwordHash !== passwordHash;
  const needsTenantUpdate = existingUser.tenantId !== normalizedTenantId;
  const needsRoleUpdate = existingUser.role !== role;

  if (
    !needsNameUpdate &&
    !needsPasswordUpdate &&
    !needsTenantUpdate &&
    !needsRoleUpdate
  ) {
    assertUserHasId(existingUser, 'retrieving the existing admin user');

    return { user: existingUser, created: false, updated: false } as const;
  }

  const user = await prisma.user.update({
    where: { email },
    data: {
      name,
      role,

      passwordHash,
      tenantId: normalizedTenantId,
    },
  });

  assertUserHasId(user, 'updating the admin user');

  return { user, created: false, updated: true } as const;
}

type SeedHierarchyParams = {
  tenantId: string;
};

type SeedHierarchyResult = {
  site: { id: string } | null;
  area: { id: string } | null;
  line: { id: string } | null;
  station: { id: string } | null;
  asset: Asset | null;
};

async function seedDemoHierarchy(params: SeedHierarchyParams): Promise<SeedHierarchyResult> {
  const { tenantId } = params;

  const site =
    (await prisma.site.findFirst({ where: { tenantId, code: 'main-plant' } })) ||
    (await prisma.site.create({
      data: {
        tenantId,
        code: 'main-plant',
        name: 'Main Plant',
        description: 'Primary manufacturing facility',
      },
    }));

  const area =
    (await prisma.area.findFirst({ where: { tenantId, siteId: site.id, code: 'production' } })) ||
    (await prisma.area.create({
      data: {
        tenantId,
        siteId: site.id,
        code: 'production',
        name: 'Production',
        description: 'High throughput production area',
      },
    }));

  const line =
    (await prisma.line.findFirst({ where: { tenantId, areaId: area.id, code: 'assembly-a' } })) ||
    (await prisma.line.create({
      data: {
        tenantId,
        areaId: area.id,
        code: 'assembly-a',
        name: 'Assembly Line A',
        description: 'Automated assembly line',
      },
    }));

  const station =
    (await prisma.station.findFirst({ where: { tenantId, lineId: line.id, code: 'station-1' } })) ||
    (await prisma.station.create({
      data: {
        tenantId,
        lineId: line.id,
        code: 'station-1',
        name: 'Press Station',
        description: 'Hydraulic press and inspection station',
        position: 1,
      },
    }));

  const existingAsset = await prisma.asset.findFirst({
    where: { tenantId, code: 'PUMP-001' },
  });

  const commonAssetData = {
    tenantId,
    siteId: site.id,
    areaId: area.id,
    lineId: line.id,
    stationId: station.id,
    category: 'Pump',
    location: 'Building A - Mechanical Room',
    purchaseDate: new Date('2023-01-15T00:00:00.000Z'),
    cost: 12500,
    status: 'operational' as const,
    criticality: 3,
    manufacturer: 'Allied Pumps Inc.',
    modelNumber: 'APX-500',
    serialNumber: 'SN-APX500-001',
    commissionedAt: new Date('2023-03-01T00:00:00.000Z'),
    warrantyProvider: 'Allied Service Partners',
    warrantyContact: 'support@alliedservice.com',
    warrantyExpiresAt: new Date('2026-03-01T00:00:00.000Z'),
    warrantyNotes: 'Annual inspection required to keep warranty valid.',
  } satisfies Partial<Asset>;

  let asset: Asset;

  if (existingAsset) {
    asset = await prisma.asset.update({
      where: { id: existingAsset.id },
      data: {
        name: 'Main Water Pump',
        ...commonAssetData,
      },
    });
  } else {
    asset = await prisma.asset.create({
      data: {
        code: 'PUMP-001',
        name: 'Main Water Pump',
        ...commonAssetData,
      },
    });
  }

  const bomSeed = [
    {
      reference: 'KIT-HP-001',
      description: 'Hydraulic pump seal kit',
      quantity: 1,
      unit: 'ea',
      notes: 'Replace annually or on wear indication',
    },
    {
      reference: 'FLT-500',
      description: 'Inlet filtration cartridge',
      quantity: 2,
      unit: 'ea',
      notes: 'Pre-filter, change every 6 months',
    },
    {
      reference: 'MTR-25HP',
      description: '25 HP drive motor',
      quantity: 1,
      unit: 'ea',
      notes: 'Spare motor stored onsite rack B3',
    },
  ] as const;

  const existingLines = await prisma.assetBomItem.findMany({
    where: { assetId: asset.id },
    select: { id: true, reference: true },
  });

  const referencesToKeep = new Set<string>();

  for (const [index, lineItem] of bomSeed.entries()) {
    const matched = existingLines.find((line) => line.reference === lineItem.reference);

    if (matched) {
      referencesToKeep.add(matched.id);
      await prisma.assetBomItem.update({
        where: { id: matched.id },
        data: {
          position: index,
          description: lineItem.description,
          quantity: lineItem.quantity,
          unit: lineItem.unit,
          notes: lineItem.notes,
        },
      });
    } else {
      const created = await prisma.assetBomItem.create({
        data: {
          tenantId,
          assetId: asset.id,
          position: index,
          reference: lineItem.reference,
          description: lineItem.description,
          quantity: lineItem.quantity,
          unit: lineItem.unit,
          notes: lineItem.notes,
        },
      });
      referencesToKeep.add(created.id);
    }
  }

  const idsToRemove = existingLines
    .filter((line) => !referencesToKeep.has(line.id))
    .map((line) => line.id);

  if (idsToRemove.length > 0) {
    await prisma.assetBomItem.deleteMany({
      where: { id: { in: idsToRemove } },
    });
  }

  return {
    site,
    area,
    line,
    station,
    asset,
  } satisfies SeedHierarchyResult;
}
