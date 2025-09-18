import mongoose from 'mongoose';

export async function connectDB(uri: string, dbName?: string) {
  try {
    await mongoose.connect(uri, {
      dbName: dbName ?? process.env.DB_NAME,
    });
    console.log('🗄️ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB');
    throw error;
  }
}
