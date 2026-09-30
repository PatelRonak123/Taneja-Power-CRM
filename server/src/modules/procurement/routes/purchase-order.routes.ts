import { Router } from 'express';
import { PurchaseOrderController } from '../controllers/purchase-order.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requirePermission } from '../../../common/middleware/auth.middleware.js';
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  listPurchaseOrdersSchema,
  getPurchaseOrderByIdSchema,
} from '../validators/procurement.validator.js';

const router = Router();
const controller = new PurchaseOrderController();

router.get(
  '/',
  authenticate,
  requirePermission('procurement:po:read'),
  validateRequest(listPurchaseOrdersSchema),
  controller.list
);

router.get(
  '/:id',
  authenticate,
  requirePermission('procurement:po:read'),
  validateRequest(getPurchaseOrderByIdSchema),
  controller.getById
);

router.post(
  '/',
  authenticate,
  requirePermission('procurement:po:create'),
  validateRequest(createPurchaseOrderSchema),
  controller.create
);

router.put(
  '/:id',
  authenticate,
  requirePermission('procurement:po:update'),
  validateRequest(updatePurchaseOrderSchema),
  controller.update
);

router.post(
  '/:id/submit',
  authenticate,
  requirePermission('procurement:po:submit'),
  controller.submit
);

router.post(
  '/:id/approve',
  authenticate,
  requirePermission('procurement:po:approve'),
  controller.approve
);

router.post(
  '/:id/cancel',
  authenticate,
  requirePermission('procurement:po:cancel'),
  controller.cancel
);

export default router;
