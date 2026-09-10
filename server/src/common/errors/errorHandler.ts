import { Response } from 'express';
import { AppError } from './AppError.js';
import { logger } from '../logger/logger.js';
import { env } from '../../config/env.js';

export const handleError = (err: Error | AppError, res: Response): void => {
  if (err instanceof AppError) {
    logger.warn(`Operational Error: ${err.message}`, {
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      details: err.details,
    });

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  logger.error(`Unhandled Exception: ${err.message}`, { stack: err.stack });

  res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
};
