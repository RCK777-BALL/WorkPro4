import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Manufacturing Co.',
    },
  });

  console.log('✅ Created tenant:', tenant.name);

  // Create users
  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@demo.com',
      passwordHash: bcrypt.hashSync('password', 10),
      name: 'Admin User',
      roles: ['admin', 'supervisor', 'planner', 'tech'],
    },
  });

  const plannerUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'planner@demo.com',
      passwordHash: bcrypt.hashSync('password', 10),
      name: 'Maintenance Planner',
      roles: ['planner', 'tech'],
    },
  });

  const techUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'tech@demo.com',
      passwordHash: bcrypt.hashSync('password', 10),
      name: 'Maintenance Tech',
      roles: ['tech'],
    },
  });

  console.log('✅ Created users');

  // Create site hierarchy
  const site = await prisma.site.create({
    data: {
      tenantId: tenant.id,
      name: 'Main Plant',
    },
  });

  const area = await prisma.area.create({
    data: {
      tenantId: tenant.id,
      siteId: site.id,
      name: 'Production Floor',
    },
  });

  const line = await prisma.line.create({
    data: {
      tenantId: tenant.id,
      areaId: area.id,
      name: 'Assembly Line 1',
    },
  });

  const station = await prisma.station.create({
    data: {
      tenantId: tenant.id,
      lineId: line.id,
      name: 'Station A',
    },
  });

  console.log('✅ Created site hierarchy');

  // Create assets
  const assets = await Promise.all([
    prisma.asset.create({
      data: {
        tenantId: tenant.id,
        stationId: station.id,
        code: 'PUMP-001',
        name: 'Hydraulic Pump #1',
        status: 'operational',
        criticality: 4,
        meterJson: [
          { name: 'Runtime Hours', value: 1250, unit: 'hrs' },
          { name: 'Pressure', value: 150, unit: 'psi' },
        ],
      },
    }),
    prisma.asset.create({
      data: {
        tenantId: tenant.id,
        stationId: station.id,
        code: 'CONV-001',
        name: 'Conveyor Belt #1',
        status: 'operational',
        criticality: 3,
        meterJson: [
          { name: 'Runtime Hours', value: 2100, unit: 'hrs' },
        ],
      },
    }),
    prisma.asset.create({
      data: {
        tenantId: tenant.id,
        stationId: station.id,
        code: 'MOTOR-001',
        name: 'Drive Motor #1',
        status: 'down',
        criticality: 5,
        meterJson: [
          { name: 'Runtime Hours', value: 3200, unit: 'hrs' },
          { name: 'Temperature', value: 85, unit: '°C' },
        ],
      },
    }),
  ]);

  console.log('✅ Created assets');

  // Create vendors
  const vendor = await prisma.vendor.create({
    data: {
      tenantId: tenant.id,
      name: 'Industrial Parts Supply',
      contactJson: {
        email: 'orders@industrialparts.com',
        phone: '555-0123',
        address: '123 Industrial Blvd, Factory City, FC 12345',
      },
    },
  });

  console.log('✅ Created vendor');

  // Create parts
  const parts = await Promise.all([
    prisma.part.create({
      data: {
        tenantId: tenant.id,
        sku: 'SEAL-001',
        name: 'Hydraulic Seal Kit',
        min: 5,
        max: 20,
        onHand: 12,
        cost: 45.99,
        vendorId: vendor.id,
      },
    }),
    prisma.part.create({
      data: {
        tenantId: tenant.id,
        sku: 'BELT-001',
        name: 'Conveyor Belt',
        min: 2,
        max: 5,
        onHand: 1, // Below minimum
        cost: 299.99,
        vendorId: vendor.id,
      },
    }),
    prisma.part.create({
      data: {
        tenantId: tenant.id,
        sku: 'OIL-001',
        name: 'Hydraulic Oil (5L)',
        min: 10,
        max: 50,
        onHand: 25,
        cost: 89.99,
        vendorId: vendor.id,
      },
    }),
  ]);

  console.log('✅ Created parts');

  // Create work orders
  const workOrders = await Promise.all([
    prisma.workOrder.create({
      data: {
        tenantId: tenant.id,
        assetId: assets[2].id, // Motor (down)
        lineName: line.name,
        stationNumber: 'A-01',
        title: 'Motor Overheating - Emergency Repair',
        description: 'Drive motor is running hot and making unusual noises. Needs immediate attention.',
        priority: 'urgent',
        status: 'assigned',
        assignees: [techUser.id],
        createdBy: plannerUser.id,
        checklists: [
          { text: 'Check motor temperature', done: false },
          { text: 'Inspect bearings', done: false },
          { text: 'Check electrical connections', done: false },
          { text: 'Replace if necessary', done: false },
        ],
      },
    }),
    prisma.workOrder.create({
      data: {
        tenantId: tenant.id,
        assetId: assets[0].id, // Pump
        lineName: line.name,
        stationNumber: 'A-02',
        title: 'Quarterly Hydraulic System Inspection',
        description: 'Routine quarterly inspection of hydraulic pump and associated components.',
        priority: 'medium',
        status: 'completed',
        assignees: [techUser.id],
        createdBy: plannerUser.id,
        timeSpentMin: 120,
        checklists: [
          { text: 'Check hydraulic fluid level', done: true, completedAt: new Date().toISOString() },
          { text: 'Inspect hoses for leaks', done: true, completedAt: new Date().toISOString() },
          { text: 'Test pressure relief valve', done: true, completedAt: new Date().toISOString() },
          { text: 'Clean filter', done: true, completedAt: new Date().toISOString() },
        ],
        signatures: [
          {
            byUserId: techUser.id,
            byName: techUser.name,
            role: 'Technician',
            ts: new Date().toISOString(),
          },
        ],
      },
    }),
    prisma.workOrder.create({
      data: {
        tenantId: tenant.id,
        assetId: assets[1].id, // Conveyor
        lineName: line.name,
        stationNumber: 'A-03',
        title: 'Conveyor Belt Replacement',
        description: 'Replace worn conveyor belt before it fails.',
        priority: 'high',
        status: 'requested',
        createdBy: plannerUser.id,
        checklists: [
          { text: 'Order replacement belt', done: false },
          { text: 'Schedule downtime', done: false },
          { text: 'Remove old belt', done: false },
          { text: 'Install new belt', done: false },
          { text: 'Test operation', done: false },
        ],
      },
    }),
  ]);

  console.log('✅ Created work orders');

  // Create PM tasks
  const pmTask = await prisma.pMTask.create({
    data: {
      tenantId: tenant.id,
      assetId: assets[0].id,
      title: 'Monthly Pump Maintenance',
      ruleJson: {
        type: 'calendar',
        cron: '0 8 1 * *', // First day of month at 8 AM
      },
      active: true,
    },
  });

  console.log('✅ Created PM task');

  // Create purchase order
  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      tenantId: tenant.id,
      vendorId: vendor.id,
      status: 'draft',
      lines: [
        { partId: parts[1].id, qty: 2, unitCost: 299.99 }, // Conveyor belts
        { partId: parts[0].id, qty: 5, unitCost: 45.99 },  // Seal kits
      ],
    },
  });

  console.log('✅ Created purchase order');

  // Create some audit logs
  await Promise.all([
    prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: plannerUser.id,
        action: 'create',
        entityType: 'work_order',
        entityId: workOrders[0].id,
        afterJson: { title: workOrders[0].title, status: 'requested' },
      },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: techUser.id,
        action: 'complete',
        entityType: 'work_order',
        entityId: workOrders[1].id,
        beforeJson: { status: 'in_progress' },
        afterJson: { status: 'completed', timeSpentMin: 120 },
      },
    }),
  ]);

  console.log('✅ Created audit logs');

  console.log('🎉 Seeding completed!');
  console.log('\nDemo credentials:');
  console.log('Admin: admin@demo.com / password');
  console.log('Planner: planner@demo.com / password');
  console.log('Tech: tech@demo.com / password');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });