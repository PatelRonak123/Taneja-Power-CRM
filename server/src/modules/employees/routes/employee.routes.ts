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

// All employee routes require authentication and ADMIN role
router.use(authenticate, requireRoles(APP_CONSTANTS.ROLES.ADMIN));

router.get('/', validateRequest(listEmployeesSchema), controller.list);
router.get('/:id', validateRequest(getEmployeeByIdSchema), controller.getById);
router.post('/', validateRequest(createEmployeeSchema), controller.create);
router.put('/:id', validateRequest(updateEmployeeSchema), controller.update);
router.delete('/:id', validateRequest(deleteEmployeeSchema), controller.delete);

export default router;
