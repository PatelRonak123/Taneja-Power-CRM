import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller.js';
import { DestinationController } from '../controllers/destination.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requireRoles } from '../../../common/middleware/auth.middleware.js';
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

// All customer & destination routes require authentication
router.use(authenticate);

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

// 2. Admin-Only Mutation Endpoints
router.post(
  '/',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN),
  validateRequest(createCustomerSchema),
  customerController.create
);
router.put(
  '/:id',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN),
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
  requireRoles(APP_CONSTANTS.ROLES.ADMIN),
  validateRequest(createDestinationSchema),
  destinationController.create
);
router.put(
  '/:customerId/destinations/:destinationId',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN),
  validateRequest(updateDestinationSchema),
  destinationController.update
);
router.delete(
  '/:customerId/destinations/:destinationId',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN),
  validateRequest(destinationParamSchema),
  destinationController.delete
);

export default router;
