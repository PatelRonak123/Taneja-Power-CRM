import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requireRoles } from '../../../common/middleware/auth.middleware.js';
import {
  createEmployeeSchema,
  listEmployeesSchema,
  getEmployeeByIdSchema,
} from '../validators/employee.validator.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const router = Router();
const controller = new EmployeeController();

// All employee routes require authentication and ADMIN role
router.use(authenticate, requireRoles(APP_CONSTANTS.ROLES.ADMIN));

router.get('/', validateRequest(listEmployeesSchema), controller.list);
router.get('/:id', validateRequest(getEmployeeByIdSchema), controller.getById);
router.post('/', validateRequest(createEmployeeSchema), controller.create);
router.delete('/:id', validateRequest(getEmployeeByIdSchema), controller.delete);

export default router;
