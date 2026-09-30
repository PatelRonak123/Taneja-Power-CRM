import { Router } from 'express';
import { SalesInvoiceController } from '../controllers/sales-invoice.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requirePermission } from '../../../common/middleware/auth.middleware.js';
import {
  createSalesInvoiceFromSOSchema,
  updateSalesInvoiceSchema,
  listSalesInvoicesSchema,
  getSalesInvoiceByIdSchema,
  submitSalesInvoiceSchema,
  issueSalesInvoiceSchema,
  cancelSalesInvoiceSchema,
} from '../validators/invoice.validator.js';

const router = Router();
const controller = new SalesInvoiceController();

// List
router.get(
  '/',
  authenticate,
  requirePermission('sales_invoice:read'),
  validateRequest(listSalesInvoicesSchema),
  controller.list
);

// Get by ID
router.get(
  '/:id',
  authenticate,
  requirePermission('sales_invoice:read'),
  validateRequest(getSalesInvoiceByIdSchema),
  controller.getById
);

// Activity Logs
router.get(
  '/:id/activity-logs',
  authenticate,
  requirePermission('sales_invoice:read'),
  validateRequest(getSalesInvoiceByIdSchema),
  controller.getActivityLogs
);

// Create from Sales Order: POST /api/sales-invoices/from-sales-order/:salesOrderId
router.post(
  '/from-sales-order/:salesOrderId',
  authenticate,
  requirePermission('sales_invoice:create'),
  validateRequest(createSalesInvoiceFromSOSchema),
  controller.createFromSalesOrder
);

// Update (DRAFT only)
router.put(
  '/:id',
  authenticate,
  requirePermission('sales_invoice:update'),
  validateRequest(updateSalesInvoiceSchema),
  controller.update
);

// Submit (DRAFT → PENDING_ISSUE)
router.post(
  '/:id/submit',
  authenticate,
  requirePermission('sales_invoice:submit'),
  validateRequest(submitSalesInvoiceSchema),
  controller.submit
);

// Issue (PENDING_ISSUE / DRAFT → ISSUED)
router.post(
  '/:id/issue',
  authenticate,
  requirePermission('sales_invoice:issue'),
  validateRequest(issueSalesInvoiceSchema),
  controller.issue
);

// Cancel (Requires reason)
router.post(
  '/:id/cancel',
  authenticate,
  requirePermission('sales_invoice:cancel'),
  validateRequest(cancelSalesInvoiceSchema),
  controller.cancel
);

export default router;
