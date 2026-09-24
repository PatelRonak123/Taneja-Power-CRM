import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requireRoles } from '../../../common/middleware/auth.middleware.js';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  listEmployeesSchema,
  getEmployeeByIdSchema,
  deleteEmployeeSchema,
} from '../validators/employee.validator.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const router = Router();
const controller = new EmployeeController();

// All employee routes require authentication
router.use(authenticate);

// 1. Read Endpoints (Admin, Manager & HR)
router.get(
  '/',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER, APP_CONSTANTS.ROLES.HR),
  validateRequest(listEmployeesSchema),
  controller.list
);
router.get(
  '/:id',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER, APP_CONSTANTS.ROLES.HR),
  validateRequest(getEmployeeByIdSchema),
  controller.getById
);

// 2. Mutation Endpoints (Admin & HR)
router.post(
  '/',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.HR),
  validateRequest(createEmployeeSchema),
  controller.create
);
router.put(
  '/:id',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.HR),
  validateRequest(updateEmployeeSchema),
  controller.update
);
router.delete(
  '/:id',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.HR),
  validateRequest(deleteEmployeeSchema),
  controller.delete
);

export default router;
