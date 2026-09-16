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

// All task routes require authentication and ADMIN or MANAGER role
router.use(
  authenticate,
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER)
);

// Task Endpoints
router.get('/', validateRequest(listTasksSchema), taskController.list);
router.post('/', validateRequest(createTaskSchema), taskController.create);
router.get('/:id', validateRequest(getTaskByIdSchema), taskController.getById);
router.put('/:id', validateRequest(updateTaskSchema), taskController.update);
router.post('/:id/cancel', validateRequest(cancelTaskSchema), taskController.cancel);
router.delete('/:id', validateRequest(deleteTaskSchema), taskController.delete);

export default router;
