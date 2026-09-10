import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';
import { logger } from '../common/logger/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client pool', { error: err.message });
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
