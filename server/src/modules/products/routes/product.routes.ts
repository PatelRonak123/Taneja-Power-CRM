import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requireRoles, requireAccountantOrAdminOrManager } from '../../../common/middleware/auth.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  getProductByIdSchema,
  listProductsSchema,
} from '../validators/product.validator.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const router = Router();
const controller = new ProductController();

// Public routes
router.get('/', validateRequest(listProductsSchema), controller.list);
router.get('/:id', validateRequest(getProductByIdSchema), controller.getById);

// Protected routes (Admin, Manager & Accountant Office)
router.post(
  '/',
  authenticate,
  requireAccountantOrAdminOrManager,
  validateRequest(createProductSchema),
  controller.create
);

router.put(
  '/:id',
  authenticate,
  requireAccountantOrAdminOrManager,
  validateRequest(updateProductSchema),
  controller.update
);

router.patch(
  '/:id',
  authenticate,
  requireAccountantOrAdminOrManager,
  validateRequest(updateProductSchema),
  controller.update
);

// Admin only routes
router.delete(
  '/:id',
  authenticate,
  requireRoles(APP_CONSTANTS.ROLES.ADMIN),
  validateRequest(getProductByIdSchema),
  controller.delete
);

export default router;
