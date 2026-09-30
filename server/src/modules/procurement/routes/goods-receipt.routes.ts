import { Router } from 'express';
import { GoodsReceiptController } from '../controllers/goods-receipt.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requirePermission } from '../../../common/middleware/auth.middleware.js';
import {
  createGoodsReceiptSchema,
  postGoodsReceiptSchema,
  listGoodsReceiptsSchema,
  getGoodsReceiptByIdSchema,
} from '../validators/procurement.validator.js';

const router = Router();
const controller = new GoodsReceiptController();

router.get(
  '/',
  authenticate,
  requirePermission('procurement:grn:read'),
  validateRequest(listGoodsReceiptsSchema),
  controller.list
);

router.get(
  '/:id',
  authenticate,
  requirePermission('procurement:grn:read'),
  validateRequest(getGoodsReceiptByIdSchema),
  controller.getById
);

router.post(
  '/',
  authenticate,
  requirePermission('procurement:grn:create'),
  validateRequest(createGoodsReceiptSchema),
  controller.create
);

router.post(
  '/:id/post',
  authenticate,
  requirePermission('procurement:grn:post'),
  validateRequest(postGoodsReceiptSchema),
  controller.post
);

export default router;
