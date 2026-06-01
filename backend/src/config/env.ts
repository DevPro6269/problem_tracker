import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED = ['PORT', 'NODE_ENV', 'DATABASE_URL', 'CORS_ORIGIN', 'JWT_SECRET', 'GOOGLE_API_KEY'] as const;

const missing = REQUIRED.filter((key) => {
  const value = process.env[key];
  return !value || value.trim() === '';
});

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
      `Copy backend/.env.example to backend/.env and fill in the values.`,
  );
}

const port = Number.parseInt(process.env.PORT as string, 10);
if (Number.isNaN(port)) {
  throw new Error(`PORT must be a number, got "${process.env.PORT}"`);
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  corsOrigin: string | string[];
  jwtSecret: string;
  googleApiKey: string;
  isProduction: boolean;
  isTest: boolean;
}

function parseCorsOrigin(value: string): string | string[] {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length === 1 ? origins[0]! : origins;
}

export const config: AppConfig = {
  port,
  nodeEnv: process.env.NODE_ENV as string,
  databaseUrl: process.env.DATABASE_URL as string,
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN as string),
  jwtSecret: process.env.JWT_SECRET as string,
  googleApiKey: process.env.GOOGLE_API_KEY as string,
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

// ADK's Gemini wrapper reads GOOGLE_GENAI_API_KEY / GEMINI_API_KEY, not
// GOOGLE_API_KEY. Mirror our env var into both names so the ADK picks it up.
if (!process.env.GOOGLE_GENAI_API_KEY) process.env.GOOGLE_GENAI_API_KEY = config.googleApiKey;
if (!process.env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = config.googleApiKey;

export default config;
