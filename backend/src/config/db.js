import mongoose from 'mongoose';
import config from './index.js';

export async function connectDB() {
  if (!config.mongoUri) {
    console.warn('[db] MONGODB_URI not set - skipping connection');
    return;
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri);
  console.log('[db] connected:', mongoose.connection.name);
}
