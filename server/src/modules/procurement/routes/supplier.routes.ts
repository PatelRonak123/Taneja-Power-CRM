import { Router } from 'express';
import { SupplierController } from '../controllers/supplier.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requirePermission } from '../../../common/middleware/auth.middleware.js';
import {
  createSupplierSchema,
  updateSupplierSchema,
  listSuppliersSchema,
  getSupplierByIdSchema,
} from '../validators/procurement.validator.js';

const router = Router();
const controller = new SupplierController();

router.get(
  '/',
  authenticate,
  requirePermission('procurement:supplier:read'),
  validateRequest(listSuppliersSchema),
  controller.list
);

router.get(
  '/next-code',
  authenticate,
  requirePermission('procurement:supplier:read'),
  controller.getNextCode
);

router.get(
  '/:id',
  authenticate,
  requirePermission('procurement:supplier:read'),
  validateRequest(getSupplierByIdSchema),
  controller.getById
);

router.post(
  '/',
  authenticate,
  requirePermission('procurement:supplier:create'),
  validateRequest(createSupplierSchema),
  controller.create
);

router.put(
  '/:id',
  authenticate,
  requirePermission('procurement:supplier:update'),
  validateRequest(updateSupplierSchema),
  controller.update
);

router.patch(
  '/:id/status',
  authenticate,
  requirePermission('procurement:supplier:update'),
  controller.setStatus
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('procurement:supplier:update'),
  controller.delete
);

export default router;
