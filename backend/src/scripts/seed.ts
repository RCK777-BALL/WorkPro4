import bcrypt from '../lib/bcrypt';

import { connectMongo, disconnectMongo } from '../config/mongo';
import { loadEnv } from '../config/env';
import User from '../models/User';

async function main(): Promise<void> {
  loadEnv();
  await connectMongo();

  const email = 'admin@demo.com';
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const doc = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        passwordHash,
        role: 'admin',
        name: 'Admin',
      },
    },
    { upsert: true, new: true },
  );

  if (!doc) {
    throw new Error('[seed] failed to prepare admin user');
  }

  console.log('[seed] admin ready:', doc.email);
  await disconnectMongo();
}

main().catch(async (error) => {
  console.error('[seed] error', error);
  await disconnectMongo();
  process.exit(1);
});
