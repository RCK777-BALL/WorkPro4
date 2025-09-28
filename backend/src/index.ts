import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from './lib/bcrypt';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { Prisma } from '@prisma/client';
import { prisma, verifyDatabaseConnection } from './db';
import { ensureJwtSecrets } from './config/auth';

// Routes
import authRoutes from './routes/auth';
import summaryRoutes from './routes/summary';
import workOrderRoutes from './routes/simpleWorkOrders';
import assetRoutes from './routes/assets';
import partRoutes from './routes/parts';
import vendorRoutes from './routes/vendors';
import searchRoutes from './routes/search';


const envPath = path.resolve(__dirname, '../.env');

// Load environment variables from backend/.env while still allowing real environment
// variables to take precedence when they are already defined.
dotenv.config({ path: envPath });

const app = express();
const PORT = Number(process.env.PORT) || 5010;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:5173',
  credentials: true,
}));

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
    console.log('🗄️ Connected to database');
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

  await ensureDemoUsers();

  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🗄️ DB health: http://localhost:${PORT}/health/db`);
    console.log(`🔐 API base: http://localhost:${PORT}/api`);
  });
}

start().catch((error) => {
  console.error('❌ Failed to start server', error);
  process.exit(1);
});

function isReplicaSetPrimaryError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2010' || error.message.includes('ReplicaSetNoPrimary')) {
      return true;
    }
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

  const tenant =
    (await prisma.tenant.findFirst({ where: { name: tenantName } })) ??
    (await prisma.tenant.create({ data: { name: tenantName } }));

  const defaultPassword = bcrypt.hashSync('Password123');

  const tenant = await prisma.tenant.upsert({
    where: { name: 'Demo Tenant' },
    update: {},
    create: { name: 'Demo Tenant' },

  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@demo.com',
        passwordHash: defaultPassword,
        name: 'Admin User',
        roles: ['admin'],
        tenantId: tenant.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'planner@demo.com',
        passwordHash: defaultPassword,
        name: 'Maintenance Planner',
        roles: ['planner'],
        tenantId: tenant.id,

      },
      create: {
        email: demoUser.email,
        passwordHash: defaultPassword,
        name: 'Maintenance Tech',
        roles: ['tech'],
        tenantId: tenant.id,

      },
    });

    if (!existingUser) {
      createdUsers.push(demoUser.email);
    }
  }

  if (createdUsers.length > 0) {
    console.log('✅ Created demo users:', createdUsers.join(', '));
  } else {
    console.log('ℹ️ Demo users already exist.');
  }

  console.log('Demo login credentials:');
  console.log('  • admin@demo.com / Password123');
  console.log('  • planner@demo.com / Password123');
  console.log('  • tech@demo.com / Password123');
}
