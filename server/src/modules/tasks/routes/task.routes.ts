import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requireRoles } from '../../../common/middleware/auth.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  cancelTaskSchema,
  listTasksSchema,
  getTaskByIdSchema,
  deleteTaskSchema,
} from '../validators/task.validator.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const router = Router();
const taskController = new TaskController();

// All task routes require authentication
router.use(authenticate);

// 1. Employee-scoped endpoint for mobile Sales Person
router.get('/my-tasks', taskController.getMyTasks);

// 2. Read single task (auth check enforced in controller for assigned employee or ADMIN/MANAGER)
router.get('/:id', validateRequest(getTaskByIdSchema), taskController.getById);

// 3. Admin & Manager Only Endpoints
router.get(
  '/',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  validateRequest(listTasksSchema),
  taskController.list
);
router.post(
  '/',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  validateRequest(createTaskSchema),
  taskController.create
);
router.put(
  '/:id',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  validateRequest(updateTaskSchema),
  taskController.update
);
router.post(
  '/:id/cancel',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  validateRequest(cancelTaskSchema),
  taskController.cancel
);
router.delete(
  '/:id',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  validateRequest(deleteTaskSchema),
  taskController.delete
);

export default router;
