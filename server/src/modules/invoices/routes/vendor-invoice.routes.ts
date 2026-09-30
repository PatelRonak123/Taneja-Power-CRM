import { Router } from 'express';
import { VendorInvoiceController } from '../controllers/vendor-invoice.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requirePermission } from '../../../common/middleware/auth.middleware.js';
import {
  createVendorInvoiceSchema,
  updateVendorInvoiceSchema,
  listVendorInvoicesSchema,
  getVendorInvoiceByIdSchema,
  submitVendorInvoiceSchema,
  verifyVendorInvoiceSchema,
  postVendorInvoiceSchema,
  cancelVendorInvoiceSchema,
} from '../validators/invoice.validator.js';

const router = Router();
const controller = new VendorInvoiceController();

// List
router.get(
  '/',
  authenticate,
  requirePermission('vendor_invoice:read'),
  validateRequest(listVendorInvoicesSchema),
  controller.list
);

// Get by ID
router.get(
  '/:id',
  authenticate,
  requirePermission('vendor_invoice:read'),
  validateRequest(getVendorInvoiceByIdSchema),
  controller.getById
);

// Activity Logs
router.get(
  '/:id/activity-logs',
  authenticate,
  requirePermission('vendor_invoice:read'),
  validateRequest(getVendorInvoiceByIdSchema),
  controller.getActivityLogs
);

// Create Vendor Invoice against PO/GRN
router.post(
  '/',
  authenticate,
  requirePermission('vendor_invoice:create'),
  validateRequest(createVendorInvoiceSchema),
  controller.create
);

// Update (DRAFT only)
router.put(
  '/:id',
  authenticate,
  requirePermission('vendor_invoice:update'),
  validateRequest(updateVendorInvoiceSchema),
  controller.update
);

// Submit (DRAFT → PENDING_VERIFICATION)
router.post(
  '/:id/submit',
  authenticate,
  requirePermission('vendor_invoice:submit'),
  validateRequest(submitVendorInvoiceSchema),
  controller.submit
);

// Verify (PENDING_VERIFICATION / DRAFT → VERIFIED)
router.post(
  '/:id/verify',
  authenticate,
  requirePermission('vendor_invoice:verify'),
  validateRequest(verifyVendorInvoiceSchema),
  controller.verify
);

// Post (VERIFIED → POSTED)
router.post(
  '/:id/post',
  authenticate,
  requirePermission('vendor_invoice:post'),
  validateRequest(postVendorInvoiceSchema),
  controller.post
);

// Cancel (Requires reason)
router.post(
  '/:id/cancel',
  authenticate,
  requirePermission('vendor_invoice:cancel'),
  validateRequest(cancelVendorInvoiceSchema),
  controller.cancel
);

export default router;
