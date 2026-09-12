import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './common/logger/logger.js';
import { pool } from './database/db.js';
import { whatsappService } from './modules/whatsapp/services/whatsapp.service.js';

const app = createApp();

const server = app.listen(env.PORT, async () => {
  logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  logger.info(`📡 API endpoint: http://localhost:${env.PORT}/api/v1`);

  // Initialize WhatsApp client & auto-restore existing session if present
  try {
    await whatsappService.initialize();
  } catch (err) {
    logger.error('Failed to initialize WhatsApp service on startup', {
      error: (err as Error).message,
    });
  }
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  try {
    await whatsappService.disconnect();
  } catch {
    // Ignore disconnect errors during shutdown
  }
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
