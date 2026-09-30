import { Router } from 'express';
import { SalesOrderController } from '../controllers/sales-order.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requirePermission } from '../../../common/middleware/auth.middleware.js';
import {
  createSalesOrderSchema,
  updateSalesOrderSchema,
  listSalesOrdersSchema,
  getSalesOrderByIdSchema,
  submitSalesOrderSchema,
  confirmSalesOrderSchema,
  cancelSalesOrderSchema,
} from '../validators/sales-order.validator.js';

const router = Router();
const controller = new SalesOrderController();

// List
router.get(
  '/',
  authenticate,
  requirePermission('sales_order:read'),
  validateRequest(listSalesOrdersSchema),
  controller.list
);

// Get by ID
router.get(
  '/:id',
  authenticate,
  requirePermission('sales_order:read'),
  validateRequest(getSalesOrderByIdSchema),
  controller.getById
);

// Create (from approved quotation)
router.post(
  '/',
  authenticate,
  requirePermission('sales_order:create'),
  validateRequest(createSalesOrderSchema),
  controller.create
);

// Update (DRAFT only)
router.put(
  '/:id',
  authenticate,
  requirePermission('sales_order:update'),
  validateRequest(updateSalesOrderSchema),
  controller.update
);

// Submit (DRAFT → PENDING_CONFIRMATION)
router.post(
  '/:id/submit',
  authenticate,
  requirePermission('sales_order:submit'),
  validateRequest(submitSalesOrderSchema),
  controller.submit
);

// Confirm (PENDING_CONFIRMATION → CONFIRMED) — Manager/Admin only
router.post(
  '/:id/confirm',
  authenticate,
  requirePermission('sales_order:confirm'),
  validateRequest(confirmSalesOrderSchema),
  controller.confirm
);

// Cancel — requires reason in body
router.post(
  '/:id/cancel',
  authenticate,
  requirePermission('sales_order:cancel'),
  validateRequest(cancelSalesOrderSchema),
  controller.cancel
);

export default router;
