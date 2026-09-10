import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './common/logger/logger.js';
import { pool } from './database/db.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  logger.info(`📡 API endpoint: http://localhost:${env.PORT}/api/v1`);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await pool.end();
      logger.info('Database pool closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error while closing database pool', { error: (err as Error).message });
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
