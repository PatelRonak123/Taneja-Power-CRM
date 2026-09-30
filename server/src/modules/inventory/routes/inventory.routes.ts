import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requirePermission } from '../../../common/middleware/auth.middleware.js';
import {
  stockAdjustmentSchema,
  stockInSchema,
  stockOutSchema,
  listInventorySchema,
  listStockMovementsSchema,
} from '../validators/inventory.validator.js';

const router = Router();
const controller = new InventoryController();

// Inventory Read Routes (Guarded by inventory:read)
router.get(
  '/',
  authenticate,
  requirePermission('inventory:read'),
  validateRequest(listInventorySchema),
  controller.getCurrentInventory
);

router.get(
  '/:productId/movements',
  authenticate,
  requirePermission('inventory:read'),
  validateRequest(listStockMovementsSchema),
  controller.getStockMovements
);

// Inventory Stock Adjustment Routes (Guarded by inventory:adjust)
router.post(
  '/adjust',
  authenticate,
  requirePermission('inventory:adjust'),
  validateRequest(stockAdjustmentSchema),
  controller.adjustStock
);

router.post(
  '/:productId/adjust',
  authenticate,
  requirePermission('inventory:adjust'),
  validateRequest(stockAdjustmentSchema),
  controller.adjustStock
);

// Manual Stock IN (Guarded by inventory:adjust)
router.post(
  '/in',
  authenticate,
  requirePermission('inventory:adjust'),
  validateRequest(stockInSchema),
  controller.addStock
);

// Manual Stock OUT (Guarded by inventory:adjust)
router.post(
  '/out',
  authenticate,
  requirePermission('inventory:adjust'),
  validateRequest(stockOutSchema),
  controller.removeStock
);

export default router;
