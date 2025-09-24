import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { prisma, verifyDatabaseConnection } from './db';
import { ensureJwtSecrets } from './config/auth';

// Routes
import authRoutes from './routes/auth';
import summaryRoutes from './routes/summary';
import workOrderRoutes from './routes/workOrders';
import assetRoutes from './routes/assets';
import partRoutes from './routes/parts';
import vendorRoutes from './routes/vendors';
import searchRoutes from './routes/search';

const envPath = path.resolve(__dirname, '../.env');

// Load environment variables from backend/.env while still allowing real environment
// variables to take precedence when they are already defined.
const dotenvResult = dotenv.config({ path: envPath });

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
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/health/db', async (_req, res) => {
  try {
    // Issue a MongoDB ping command to validate connectivity
    await prisma.$runCommandRaw({ ping: 1 });
    res.json({ ok: true });
  } catch (error) {
    console.error('❌ MongoDB health check failed', error);
    res.status(503).json({ ok: false });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/dashboard', summaryRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/search', searchRoutes);

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

  const databaseUrl =
    process.env.DATABASE_URL?.trim() ?? dotenvResult.parsed?.DATABASE_URL?.trim();

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

async function ensureDemoUsers() {
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    return;
  }

  console.log('👥 No users found in database. Creating demo tenant and credentials...');

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Manufacturing Co.',
    },
  });

  const defaultPassword = bcrypt.hashSync('Password123', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'admin@demo.com',
        passwordHash: defaultPassword,
        name: 'Admin User',
        roles: ['admin', 'supervisor', 'planner', 'tech'],
      },
    }),
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'planner@demo.com',
        passwordHash: defaultPassword,
        name: 'Maintenance Planner',
        roles: ['planner', 'tech'],
      },
    }),
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'tech@demo.com',
        passwordHash: defaultPassword,
        name: 'Maintenance Tech',
        roles: ['tech'],
      },
    }),
  ]);

  console.log('✅ Created demo tenant:', tenant.name);
  console.log('✅ Created demo users:', users.map((user) => user.email).join(', '));
  console.log('Demo login credentials:');
  console.log('  • admin@demo.com / Password123');
  console.log('  • planner@demo.com / Password123');
  console.log('  • tech@demo.com / Password123');
}
