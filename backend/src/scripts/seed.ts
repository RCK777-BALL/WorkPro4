import { loadEnv } from '../config/env';
import bcrypt from '../lib/bcrypt';
import { connectMongo, disconnectMongo } from '../config/mongo';
import User from '../models/User';

async function main(): Promise<void> {
  loadEnv();
  await connectMongo();

  const email = 'admin@demo.com';
  const password = 'Admin@123';
  const passwordHash = await bcrypt.hash(password, 10);

  const updated = await User.findOneAndUpdate(
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

  if (!updated) {
    await disconnectMongo();
    throw new Error('[seed] failed to upsert admin user');
  }

  console.log('[seed] admin ready:', { email: updated.email, role: updated.role });
  await disconnectMongo();
}

main().catch(async (error) => {
  console.error('[seed] error', error);
  await disconnectMongo();
  process.exit(1);
});
