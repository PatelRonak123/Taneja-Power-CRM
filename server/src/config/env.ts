import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Explicit pre-validation for NODE_ENV
const rawNodeEnv = process.env.NODE_ENV || 'development';
const VALID_NODE_ENVS = ['development', 'production', 'test'] as const;
export type NodeEnvironment = (typeof VALID_NODE_ENVS)[number];

if (!VALID_NODE_ENVS.includes(rawNodeEnv as NodeEnvironment)) {
  console.error('\n======================================================');
  console.error('❌ Invalid NODE_ENV:');
  console.error(`   Expected: ${VALID_NODE_ENVS.join(' | ')}`);
  console.error(`   Received: ${rawNodeEnv}`);
  console.error('======================================================\n');
  process.exit(1);
}

const envSchema = z.object({
  NODE_ENV: z.enum(VALID_NODE_ENVS).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_SECURE: z.preprocess(
    (v) => (v === 'true' || v === true ? true : v === 'false' || v === false ? false : undefined),
    z.boolean().optional()
  ),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().optional(),
  TRUST_PROXY: z.preprocess(
    (v) =>
      v === 'true' || v === true
        ? true
        : v === 'false' || v === false
        ? false
        : v === undefined
        ? undefined
        : Number.isNaN(Number(v))
        ? v
        : Number(v),
    z.union([z.boolean(), z.number(), z.string()]).optional()
  ),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('Taneja Power Systems <onboarding@resend.dev>'),
  OFFICE_LATITUDE: z.coerce.number().default(22.2965),
  OFFICE_LONGITUDE: z.coerce.number().default(73.1495),
  OFFICE_RADIUS_METERS: z.coerce.number().default(500),
  WHATSAPP_ENABLED: z.preprocess(
    (v) => (v === 'false' || v === false ? false : true),
    z.boolean().default(true)
  ),
  ALLOW_PRODUCTION_SEED: z.preprocess(
    (v) => (v === 'true' || v === true ? true : false),
    z.boolean().default(false)
  ),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n======================================================');
    console.error('❌ Environment configuration error:');
    console.error(`   NODE_ENV: ${rawNodeEnv}`);
    console.error('------------------------------------------------------');
    const errors = result.error.format();
    for (const [key, value] of Object.entries(errors)) {
      if (key === '_errors') continue;
      const fieldErrors = (value as { _errors?: string[] })?._errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        console.error(`   - ${key}: ${fieldErrors.join(', ')}`);
      }
    }
    console.error('======================================================\n');
    process.exit(1);
  }

  const data = result.data;
  const isDevelopment = data.NODE_ENV === 'development';
  const isProduction = data.NODE_ENV === 'production';
  const isTest = data.NODE_ENV === 'test';

  // Production-specific validations
  if (isProduction) {
    const prodErrors: string[] = [];

    if (data.CORS_ORIGIN.trim() === '*') {
      prodErrors.push('CORS_ORIGIN cannot be "*" in production when credentials are enabled.');
    }

    if (data.JWT_SECRET === 'super_secret_jwt_key_for_development_mode_min_32_chars') {
      prodErrors.push('JWT_SECRET cannot use default development placeholder key in production.');
    }

    if (prodErrors.length > 0) {
      console.error('\n======================================================');
      console.error('❌ Production Configuration Safety Validation Failed:');
      prodErrors.forEach((err) => console.error(`   - ${err}`));
      console.error('======================================================\n');
      process.exit(1);
    }
  }

  // Parse allowed CORS origins list (split by comma)
  const corsOrigins = data.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    ...data,
    isDevelopment,
    isProduction,
    isTest,
    corsOrigins,
  };
};

export const env = parseEnv();
export type Env = ReturnType<typeof parseEnv>;

