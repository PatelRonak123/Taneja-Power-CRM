import { Router } from 'express';
import { CustomerEquipmentController } from '../controllers/customer-equipment.controller.js';
import { authenticate, requirePermission, requireRoles } from '../../../common/middleware/auth.middleware.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const router = Router();
const controller = new CustomerEquipmentController();

// GET /api/customer-equipment - List customer equipment with filters
router.get(
  '/',
  authenticate,
  requirePermission('customers:read'),
  controller.list
);

// GET /api/customer-equipment/customers/:customerId - Dedicated subroute for customer's equipment
router.get(
  '/customers/:customerId',
  authenticate,
  requirePermission('customers:read'),
  controller.getByCustomerId
);

// GET /api/customer-equipment/:id/service-history - Get service history
router.get(
  '/:id/service-history',
  authenticate,
  requirePermission('customers:read'),
  controller.getServiceHistory
);

// GET /api/customer-equipment/:id/amc-history - Get AMC contracts history
router.get(
  '/:id/amc-history',
  authenticate,
  requirePermission('customers:read'),
  controller.getAmcHistory
);

// GET /api/customer-equipment/:id - Get equipment detail
router.get(
  '/:id',
  authenticate,
  requirePermission('customers:read'),
  controller.getById
);

// PATCH /api/customer-equipment/:id - Update operational fields
router.patch(
  '/:id',
  authenticate,
  requirePermission('customers:edit'),
  controller.update
);

// POST /api/customer-equipment/manual - Manual legacy asset creation (Admin/Manager only)
router.post(
  '/manual',
  authenticate,
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  controller.manualCreate
);

export default router;
