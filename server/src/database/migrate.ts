import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './db.js';
import { logger } from '../common/logger/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const runMigrations = async (): Promise<void> => {
  logger.info('Running database migrations...');
  try {
    const migrationsFolder = path.resolve(__dirname, '../../drizzle');
    await migrate(db, { migrationsFolder });
    logger.info('Database migrations applied successfully');
  } catch (error) {
    logger.error('Database migration failed', { error: (error as Error).message });
    throw error;
  }
};

// If executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await pool.end();
      process.exit(1);
    });
}
