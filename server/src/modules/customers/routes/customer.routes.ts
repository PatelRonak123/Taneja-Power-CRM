import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller.js';
import { DestinationController } from '../controllers/destination.controller.js';
import { CustomerEquipmentController } from '../../customer-equipment/controllers/customer-equipment.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requireRoles, requirePermission } from '../../../common/middleware/auth.middleware.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersSchema,
  getCustomerByIdSchema,
  deleteCustomerSchema,
  createDestinationSchema,
  updateDestinationSchema,
  destinationParamSchema,
  destinationListSchema,
} from '../validators/customer.validator.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const router = Router();
const customerController = new CustomerController();
const destinationController = new DestinationController();
const equipmentController = new CustomerEquipmentController();

// All customer & destination routes require authentication
router.use(authenticate);

// Customer Equipment route
router.get('/:customerId/equipment', equipmentController.getByCustomerId);

// 1. Read Endpoints (Accessible to all authenticated roles including field staff/sales)
router.get('/', validateRequest(listCustomersSchema), customerController.list);
router.get('/:id', validateRequest(getCustomerByIdSchema), customerController.getById);

router.get(
  '/:customerId/destinations',
  validateRequest(destinationListSchema),
  destinationController.list
);
router.get(
  '/:customerId/destinations/:destinationId',
  validateRequest(destinationParamSchema),
  destinationController.getById
);

// 2. Customer Mutation Endpoints
router.post(
  '/',
  requirePermission('customers:create'),
  validateRequest(createCustomerSchema),
  customerController.create
);
router.put(
  '/:id',
  requirePermission('customers:edit'),
  validateRequest(updateCustomerSchema),
  customerController.update
);
router.delete(
  '/:id',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN),
  validateRequest(deleteCustomerSchema),
  customerController.delete
);

router.post(
  '/:customerId/destinations',
  requirePermission('customers:create'),
  validateRequest(createDestinationSchema),
  destinationController.create
);
router.put(
  '/:customerId/destinations/:destinationId',
  requirePermission('customers:edit'),
  validateRequest(updateDestinationSchema),
  destinationController.update
);
router.delete(
  '/:customerId/destinations/:destinationId',
  requirePermission('customers:edit'),
  validateRequest(destinationParamSchema),
  destinationController.delete
);

export default router;
