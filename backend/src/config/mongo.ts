import mongoose from '../lib/mongoose';

mongoose.set('strictQuery', true);

export async function connectMongo(): Promise<void> {
  const url = process.env.DATABASE_URL ?? process.env.MONGO_URL;
  if (!url) {
    throw new Error('Missing DATABASE_URL in environment');

  }
  await mongoose.connect(url);
  const { name, host } = mongoose.connection;
  console.log('[mongo] connected:', name, '@', host);
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('[mongo] disconnected');
  }
}

process.on('SIGINT', async () => {
  await disconnectMongo();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectMongo();
  process.exit(0);
});

