import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Environment configuration schema with validation and sensible defaults.
 * Validates all required variables on startup to fail fast.
 */
const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().default('postgresql://localhost:5432/grad_hub'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

/**
 * Frozen config object — read-only after initialization.
 * Provides typed access to all environment variables with defaults applied.
 */
export const config = Object.freeze({
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  corsOrigin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
});

export type Config = typeof config;
