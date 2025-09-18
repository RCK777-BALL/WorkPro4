import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { connectDB } from './db';

// Routes
import authRoutes from './routes/auth';
import summaryRoutes from './routes/summary';
import workOrderRoutes from './routes/workOrders';
import assetRoutes from './routes/assets';
import partRoutes from './routes/parts';
import vendorRoutes from './routes/vendors';
import searchRoutes from './routes/search';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3000',
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

app.get('/health/db', (_req, res) => {
  res.json({ readyState: mongoose.connection.readyState });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/summary', summaryRoutes);
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
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('❌ MONGO_URI environment variable is required');
    process.exit(1);
  }

  await connectDB(mongoUri, process.env.DB_NAME);

  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/health`);
    console.log(`🗄️ DB health: http://localhost:${PORT}/health/db`);
    console.log(`🔐 API base: http://localhost:${PORT}/api`);
  });
}

start().catch((error) => {
  console.error('❌ Failed to start server', error);
  process.exit(1);
});
