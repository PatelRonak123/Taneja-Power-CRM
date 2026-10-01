import { Router } from 'express';
import { DispatchController } from '../controllers/dispatch.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requirePermission } from '../../../common/middleware/auth.middleware.js';
import {
  createDispatchSchema,
  updateDispatchSchema,
  getDispatchByIdSchema,
  submitDispatchSchema,
  confirmDispatchSchema,
  cancelDispatchSchema,
  listDispatchesQuerySchema,
  getDispatchableItemsSchema,
} from '../validators/dispatch.validator.js';

const router = Router();
const controller = new DispatchController();

// GET /api/dispatches - List dispatches
router.get(
  '/',
  authenticate,
  requirePermission('dispatch:read'),
  validateRequest(listDispatchesQuerySchema),
  controller.list
);

// GET /api/dispatches/sales-order/:salesOrderId/dispatchable-items - Get dispatchable items for SO
router.get(
  '/sales-order/:salesOrderId/dispatchable-items',
  authenticate,
  requirePermission('dispatch:read'),
  validateRequest(getDispatchableItemsSchema),
  controller.getDispatchableItems
);

// GET /api/dispatches/:id - Get dispatch by ID
router.get(
  '/:id',
  authenticate,
  requirePermission('dispatch:read'),
  validateRequest(getDispatchByIdSchema),
  controller.getById
);

// POST /api/dispatches - Create draft dispatch
router.post(
  '/',
  authenticate,
  requirePermission('dispatch:create'),
  validateRequest(createDispatchSchema),
  controller.create
);

// PUT /api/dispatches/:id - Update draft dispatch
router.put(
  '/:id',
  authenticate,
  requirePermission('dispatch:update'),
  validateRequest(updateDispatchSchema),
  controller.update
);

// POST /api/dispatches/:id/submit - Submit dispatch for confirmation
router.post(
  '/:id/submit',
  authenticate,
  requirePermission('dispatch:submit'),
  validateRequest(submitDispatchSchema),
  controller.submit
);

// POST /api/dispatches/:id/dispatch - Confirm dispatch and execute physical Stock OUT
router.post(
  '/:id/dispatch',
  authenticate,
  requirePermission('dispatch:dispatch'),
  validateRequest(confirmDispatchSchema),
  controller.confirm
);

// POST /api/dispatches/:id/cancel - Cancel dispatch (with reason)
router.post(
  '/:id/cancel',
  authenticate,
  requirePermission('dispatch:cancel'),
  validateRequest(cancelDispatchSchema),
  controller.cancel
);

export default router;
