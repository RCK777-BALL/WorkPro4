import './bootstrapEnv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from './lib/bcrypt';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { prisma, verifyDatabaseConnection } from './db';
import { ensureJwtSecrets } from './config/auth';
import { ensureAdminNoTxn, ensureTenantNoTxn } from './lib/seedHelpers';

// Routes
import authRoutes from './routes/auth';
import summaryRoutes from './routes/summary';
import workOrderRoutes from './routes/simpleWorkOrders';
import assetRoutes from './routes/assets';
import partRoutes from './routes/parts';
import vendorRoutes from './routes/vendors';
import searchRoutes from './routes/search';


const app = express();
const PORT = Number(process.env.PORT) || 5010;
const isProduction = process.env.NODE_ENV === 'production';
const configuredFrontendOrigin = process.env.FRONTEND_ORIGIN?.trim() ?? process.env.FRONTEND_URL?.trim();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: isProduction ? configuredFrontendOrigin || 'http://localhost:5173' : 'http://localhost:5173',
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check
async function handleHealthCheck(_req: express.Request, res: express.Response) {
  try {
    await verifyDatabaseConnection();
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('❌ Health check failed to reach database:', message, error);

    res.status(500).json({
      ok: false,
      error: 'Database connection failed',
    });
  }
}

app.get('/health', handleHealthCheck);
app.get('/api/health', handleHealthCheck);
app.get('/health/db', handleHealthCheck);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/work-orders', workOrderRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    data: null,
    error: {
      code: 404,
      message: 'Route not found',
    },
  });
});

async function start() {
  try {
    ensureJwtSecrets();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error validating JWT configuration';
    console.error(`❌ ${message}`);
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required. Shutting down.');
    process.exit(1);
    return;
  }

  try {
    await verifyDatabaseConnection();
    console.log('Connected to database');
  } catch (error) {
    console.error('❌ Failed to connect to database', error);

    if (isReplicaSetPrimaryError(error)) {
      console.error(
        '💡 MongoDB replica set primary not found. Initialize a replica set or remove the `replicaSet` parameter so direct connections are allowed.',
      );
    }

    process.exit(1);
    return;
  }

  await seedDefaultsNoTxn();

  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
    console.log(`Health check ready at http://localhost:${PORT}/api/health`);
    console.log(`DB health at http://localhost:${PORT}/health/db`);
    console.log(`API base at http://localhost:${PORT}/api`);
  });
}

start().catch((error) => {
  console.error('❌ Failed to start server', error);
  process.exit(1);
});

async function seedDefaultsNoTxn(): Promise<void> {
  const tenantName = process.env.DEFAULT_TENANT_NAME?.trim() || 'Demo Tenant';
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL?.trim() || 'admin@demo.com';
  const adminName = process.env.DEFAULT_ADMIN_NAME?.trim() || 'Admin';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123';
  const seedWorkOrder = process.env.SEED_SAMPLE_WORK_ORDER !== 'false';
  const workOrderTitle = process.env.SAMPLE_WORK_ORDER_TITLE?.trim() || 'Demo Work Order';
  const workOrderDescription =
    process.env.SAMPLE_WORK_ORDER_DESCRIPTION?.trim() || 'Inspect the demo asset and confirm it is running.';

  let tenantResult: Awaited<ReturnType<typeof ensureTenantNoTxn>>;

  try {
    tenantResult = await ensureTenantNoTxn(prisma, tenantName);
  } catch (error) {
    console.error('[seed] failed to ensure default tenant before admin creation:', error);
    return;
  }

  const tenant = tenantResult.tenant;

  if (!tenant?.id) {
    console.error('[seed] tenant creation did not return a valid id. Skipping admin seeding.');
    return;
  }
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const { admin } = await ensureAdminNoTxn({
    prisma,
    tenantId: tenant.id,
    email: adminEmail,
    name: adminName,
    passwordHash,
    roles: ['admin'],
  });

  console.log('[seed] tenant+admin ready (non-transactional)');

  if (!seedWorkOrder) {
    return;
  }

  const existingWorkOrder = await prisma.workOrder.findFirst({
    where: {
      tenantId: tenant.id,
      title: workOrderTitle,
    },
  });

  if (existingWorkOrder) {
    console.log('[seed] sample work order already exists:', existingWorkOrder.id);
    return;
  }

  const workOrder = await prisma.workOrder.create({
    data: {
      tenantId: tenant.id,
      title: workOrderTitle,
      description: workOrderDescription,
      priority: 'medium',
      status: 'requested',
      assignees: [admin.id],
      createdBy: admin.id,
    },
  });

  console.log('[seed] sample work order created:', workOrder.id);
}

function isReplicaSetPrimaryError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  // Some Prisma versions may not export a Prisma namespace; do a structural check instead.
  const anyErr = error as any;
  if (
    anyErr &&
    (anyErr.code === 'P2010' || (typeof anyErr.message === 'string' && anyErr.message.includes('ReplicaSetNoPrimary')))
  ) {
    return true;
  }

  if (error instanceof Error && error.message.includes('ReplicaSetNoPrimary')) {
    return true;
  }

  // Check nested causes for forwarded driver errors
  const cause = (error as { cause?: unknown }).cause;
  if (cause) {
    return isReplicaSetPrimaryError(cause);
  }

  return false;
}

async function ensureDemoUsers() {
  const tenantName = 'Demo Tenant';
  const tenantSlug = tenantName.toLowerCase().replace(/\s+/g, '-');

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName, slug: tenantSlug },

    create: { name: tenantName, slug: tenantSlug },

  });

  const defaultPassword = bcrypt.hashSync('Password123');

  const demoUsers = [
    { email: 'admin@demo.com', name: 'Admin User', role: 'admin' },
    { email: 'planner@demo.com', name: 'Maintenance Planner', role: 'planner' },
    { email: 'tech@demo.com', name: 'Maintenance Tech', role: 'tech' },
  ];

  const createdUsers: string[] = [];
  const updatedUsers: string[] = [];

  for (const demoUser of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {
        passwordHash: defaultPassword,
        name: demoUser.name,
        role: demoUser.role,
        tenantId: tenant.id,
      },
      create: {
        email: demoUser.email,
        passwordHash: defaultPassword,
        name: demoUser.name,
        role: demoUser.role,
        tenantId: tenant.id,
      },
    });

    if (user.createdAt.getTime() === user.updatedAt.getTime()) {
      createdUsers.push(demoUser.email);
    } else {
      updatedUsers.push(demoUser.email);
    }
  }

  if (createdUsers.length > 0) {
    console.log('✅ Created demo users:', createdUsers.join(', '));
  }

  if (updatedUsers.length > 0) {
    console.log('♻️ Updated demo users:', updatedUsers.join(', '));
  }

  console.log('Demo login credentials:');
  console.log('  • admin@demo.com / Password123');
  console.log('  • planner@demo.com / Password123');
  console.log('  • tech@demo.com / Password123');
}

