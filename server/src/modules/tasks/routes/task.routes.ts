import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requireRoles, requireTaskManager } from '../../../common/middleware/auth.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  cancelTaskSchema,
  listTasksSchema,
  getTaskByIdSchema,
  deleteTaskSchema,
  startTaskSchema,
  updateTaskLocationSchema,
  completeTaskSchema,
} from '../validators/task.validator.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const router = Router();
const taskController = new TaskController();

// All task routes require authentication
router.use(authenticate);

// 1. Employee-scoped endpoint for mobile / field employees
router.get('/my-tasks', taskController.getMyTasks);

// 2a. Service-type FIELD employees (for Service Office assignment dropdown — must be before /:id)
router.get(
  '/field-employees',
  requireTaskManager,
  taskController.getFieldEmployees
);

// 2b. Sales-type FIELD employees (for Sales Office assignment dropdown — must be before /:id)
router.get(
  '/sales-field-employees',
  requireTaskManager,
  taskController.getSalesFieldEmployees
);

// 3. Admin & Manager Live Route Tracking Overview (must be defined before /:id)
router.get(
  '/active-tracking',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  taskController.getActiveTracking
);

// 4. Task Execution Lifecycle & Live Location Telemetry (Field Employee & Admin)
router.post('/:id/start', validateRequest(startTaskSchema), taskController.startTask);
router.post('/:id/location', validateRequest(updateTaskLocationSchema), taskController.updateLocation);
router.post('/:id/complete', validateRequest(completeTaskSchema), taskController.completeTask);
router.get('/:id/tracking', validateRequest(getTaskByIdSchema), taskController.getTaskTracking);

// 5. Read single task (ownership enforced in controller per role)
router.get('/:id', validateRequest(getTaskByIdSchema), taskController.getById);

// 6. Management Endpoints (Admin, Manager, Sales Office & Service Office)
router.get(
  '/',
  requireTaskManager,
  validateRequest(listTasksSchema),
  taskController.list
);
router.post(
  '/',
  requireTaskManager,
  validateRequest(createTaskSchema),
  taskController.create
);
router.put(
  '/:id',
  requireTaskManager,
  validateRequest(updateTaskSchema),
  taskController.update
);
router.post(
  '/:id/cancel',
  requireTaskManager,
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
