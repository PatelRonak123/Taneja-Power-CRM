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
import customerRoutes from './modules/customers/routes/customer.routes.js';
import whatsappRoutes from './modules/whatsapp/routes/whatsapp.routes.js';
import taskRoutes from './modules/tasks/routes/task.routes.js';
import attendanceRoutes from './modules/attendance/routes/attendance.routes.js';
import leadRoutes from './modules/leads/routes/lead.routes.js';
import geocodingRoutes from './modules/geocoding/geocoding.routes.js';
import quotationRoutes from './modules/quotations/routes/quotation.routes.js';
import amcContractRoutes from './modules/amc-contracts/routes/amc-contract.routes.js';
import fieldServiceRoutes from './modules/field-service/routes/field-service.routes.js';
import followUpRoutes from './modules/follow-ups/routes/follow-up.routes.js';
import inventoryRoutes from './modules/inventory/routes/inventory.routes.js';
import {
  supplierRoutes,
  purchaseOrderRoutes,
  goodsReceiptRoutes,
} from './modules/procurement/routes/index.js';
import salesOrderRoutes from './modules/sales-orders/routes/sales-order.routes.js';
import salesInvoiceRoutes from './modules/invoices/routes/sales-invoice.routes.js';
import vendorInvoiceRoutes from './modules/invoices/routes/vendor-invoice.routes.js';
import dispatchRoutes from './modules/dispatch/routes/dispatch.routes.js';
import customerEquipmentRoutes from './modules/customer-equipment/routes/customer-equipment.routes.js';
import paymentRoutes from './modules/payments/routes/payment.routes.js';
import path from 'path';
import { sendResponse } from './common/utils/responseEnvelope.js';

export const createApp = (): Application => {
  const app = express();

  // Trust proxy in production or when explicitly configured (essential for secure cookies behind reverse proxy)
  if (env.TRUST_PROXY !== undefined) {
    app.set('trust proxy', env.TRUST_PROXY);
  } else if (env.isProduction) {
    app.set('trust proxy', 1);
  }

  // Global CORS Middleware
  const allowedOrigins = env.corsOrigins;

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!requestOrigin) {
          return callback(null, true);
        }

        // In development, allow configured origins plus local development tooling
        if (env.isDevelopment) {
          if (
            allowedOrigins.includes(requestOrigin) ||
            requestOrigin.startsWith('http://localhost:') ||
            requestOrigin.startsWith('http://127.0.0.1:')
          ) {
            return callback(null, true);
          }
          return callback(null, true);
        }

        // In production, strictly match configured origins
        if (allowedOrigins.includes(requestOrigin)) {
          return callback(null, true);
        }

        return callback(new Error(`CORS origin '${requestOrigin}' not allowed by policy`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Static Uploads Serving
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // Health Check Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    sendResponse(res, 200, { status: 'healthy', timestamp: new Date().toISOString() }, 'System operational');
  });

  // API Routes
  app.use(`${APP_CONSTANTS.API_PREFIX}/auth`, authRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/products`, productRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/employees`, employeeRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/customers`, customerRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/whatsapp`, whatsappRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/tasks`, taskRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/attendance`, attendanceRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/leads`, leadRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/geocoding`, geocodingRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/quotations`, quotationRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/amc-contracts`, amcContractRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/field-service`, fieldServiceRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/follow-ups`, followUpRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/inventory`, inventoryRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/suppliers`, supplierRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/purchase-orders`, purchaseOrderRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/goods-receipts`, goodsReceiptRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/sales-orders`, salesOrderRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/sales-invoices`, salesInvoiceRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/vendor-invoices`, vendorInvoiceRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/dispatches`, dispatchRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/customer-equipment`, customerEquipmentRoutes);
  app.use(`${APP_CONSTANTS.API_PREFIX}/payments`, paymentRoutes);

  // 404 Handler
  app.use(notFoundMiddleware);

  // Global Error Handler
  app.use(errorMiddleware);

  return app;
};
