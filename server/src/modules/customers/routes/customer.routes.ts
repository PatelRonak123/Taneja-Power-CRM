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

// All customer & destination routes require authentication and ADMIN role
router.use(authenticate, requireRoles(APP_CONSTANTS.ROLES.ADMIN));

// Customer Endpoints
router.get('/', validateRequest(listCustomersSchema), customerController.list);
router.post('/', validateRequest(createCustomerSchema), customerController.create);
router.get('/:id', validateRequest(getCustomerByIdSchema), customerController.getById);
router.put('/:id', validateRequest(updateCustomerSchema), customerController.update);
router.delete('/:id', validateRequest(deleteCustomerSchema), customerController.delete);

// Customer Destination Endpoints
router.get(
  '/:customerId/destinations',
  validateRequest(destinationListSchema),
  destinationController.list
);
router.post(
  '/:customerId/destinations',
  validateRequest(createDestinationSchema),
  destinationController.create
);
router.get(
  '/:customerId/destinations/:destinationId',
  validateRequest(destinationParamSchema),
  destinationController.getById
);
router.put(
  '/:customerId/destinations/:destinationId',
  validateRequest(updateDestinationSchema),
  destinationController.update
);
router.delete(
  '/:customerId/destinations/:destinationId',
  validateRequest(destinationParamSchema),
  destinationController.delete
);

export default router;
