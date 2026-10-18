
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

// backend/src/config -> backend/
const backendRoot = path.resolve(currentDir, '../..');

// Load backend/.env locally.
// Render environment variables take precedence over values in .env.
dotenv.config({
  path: path.join(backendRoot, '.env'),
});

const parseOrigins = (value) =>
  value
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const config = {
  port: Number(process.env.PORT) || 5000,

  nodeEnv: process.env.NODE_ENV || 'development',

  mongoUri: process.env.MONGODB_URI || '',

  // Do not use a predictable JWT secret in production.
  jwtSecret: process.env.JWT_SECRET || (
    process.env.NODE_ENV === 'production'
      ? ''
      : 'dev_secret_change_me'
  ),

  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',

  // Comma-separated origins, configured in Render or backend/.env.
  corsOrigins: parseOrigins(
    process.env.CORS_ORIGIN || 'http://localhost:5173'
  ),
};

// Fail fast when essential production configuration is missing.
if (config.nodeEnv === 'production') {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI must be configured in production.');
  }

  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET must be configured in production.');
  }

  if (config.jwtSecret === 'dev_secret_change_me') {
    throw new Error('A secure JWT_SECRET is required in production.');
  }
}

export default config;
