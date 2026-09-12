import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { APP_CONSTANTS } from './config/constants.js';
import { notFoundMiddleware } from './common/middleware/notFound.middleware.js';
import { errorMiddleware } from './common/middleware/error.middleware.js';
import authRoutes from './modules/auth/routes/auth.routes.js';
import productRoutes from './modules/products/routes/product.routes.js';
import employeeRoutes from './modules/employees/routes/employee.routes.js';
import whatsappRoutes from './modules/whatsapp/routes/whatsapp.routes.js';
import { sendResponse } from './common/utils/responseEnvelope.js';

export const createApp = (): Application => {
  const app = express();

  // Global Middleware
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health Check Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    sendResponse(res, 200, { status: 'healthy', timestamp: new Date().toISOString() }, 'System operational');
  });

  // API Routes
  app.use(`${APP_CONSTANTS.API_PREFIX}/auth`, authRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/products`, productRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/employees`, employeeRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/whatsapp`, whatsappRoutes);

  // 404 Handler
  app.use(notFoundMiddleware);

  // Global Error Handler
  app.use(errorMiddleware);

  return app;
};
