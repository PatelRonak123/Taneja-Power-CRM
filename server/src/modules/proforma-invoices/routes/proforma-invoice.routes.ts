import { Router } from 'express';
import { ProformaInvoiceController } from '../controllers/proforma-invoice.controller.js';
import { authenticate, requirePermission } from '../../../common/middleware/auth.middleware.js';

const router = Router();
const controller = new ProformaInvoiceController();

// List Pro Forma Invoices
router.get(
  '/',
  authenticate,
  requirePermission('proforma_invoice:read'),
  controller.list
);

// Get Pro Forma Invoice by ID
router.get(
  '/:id',
  authenticate,
  requirePermission('proforma_invoice:read'),
  controller.getById
);

// Generate Pro Forma Invoice from a confirmed Sales Order
router.post(
  '/from-sales-order/:salesOrderId',
  authenticate,
  requirePermission('proforma_invoice:create'),
  controller.createFromSalesOrder
);

// Update draft Pro Forma Invoice
router.patch(
  '/:id',
  authenticate,
  requirePermission('proforma_invoice:update'),
  controller.update
);

// Issue Pro Forma Invoice (DRAFT -> ISSUED)
router.post(
  '/:id/issue',
  authenticate,
  requirePermission('proforma_invoice:issue'),
  controller.issue
);

// Cancel Pro Forma Invoice
router.post(
  '/:id/cancel',
  authenticate,
  requirePermission('proforma_invoice:cancel'),
  controller.cancel
);

// Send Pro Forma Invoice via Email to Customer
router.post(
  '/:id/send-email',
  authenticate,
  requirePermission('proforma_invoice:read'),
  controller.sendEmail
);

export default router;
