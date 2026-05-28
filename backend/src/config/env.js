import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED = ['PORT', 'NODE_ENV', 'DATABASE_URL', 'CORS_ORIGIN'];

const missing = REQUIRED.filter((key) => !process.env[key] || process.env[key].trim() === '');
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
      `Copy backend/.env.example to backend/.env and fill in the values.`,
  );
}

const port = Number.parseInt(process.env.PORT, 10);
if (Number.isNaN(port)) {
  throw new Error(`PORT must be a number, got "${process.env.PORT}"`);
}

export const config = {
  port,
  nodeEnv: process.env.NODE_ENV,
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN,
  isProduction: process.env.NODE_ENV === 'production',
};

export default config;
