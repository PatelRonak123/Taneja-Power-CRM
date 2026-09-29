import { Router } from 'express';
import { FollowUpController } from '../controllers/follow-up.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import {
  authenticate,
  requireRoles,
  requirePermission,
  denyDesignations,
} from '../../../common/middleware/auth.middleware.js';
import {
  createFollowUpSchema,
  updateFollowUpSchema,
  completeFollowUpSchema,
  rescheduleFollowUpSchema,
  cancelFollowUpSchema,
  getFollowUpByIdSchema,
  listFollowUpsSchema,
} from '../validators/follow-up.validator.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const router = Router();
const followUpController = new FollowUpController();

// All follow-up endpoints require authentication
router.use(authenticate);

// 1. Dashboard Metrics
router.get(
  '/metrics',
  requirePermission('followups:read'),
  followUpController.getMetrics
);

// 2. Read / List Endpoints
router.get(
  '/',
  requirePermission('followups:read'),
  validateRequest(listFollowUpsSchema),
  followUpController.list
);

router.get(
  '/:id',
  requirePermission('followups:read'),
  validateRequest(getFollowUpByIdSchema),
  followUpController.getById
);

// 3. Create Endpoint
router.post(
  '/',
  requirePermission('followups:create'),
  denyDesignations('Accountant Office', 'HR Office', 'HR'),
  validateRequest(createFollowUpSchema),
  followUpController.create
);

// 4. Update Details Endpoint
router.patch(
  '/:id',
  requirePermission('followups:update'),
  denyDesignations('Accountant Office', 'HR Office', 'HR'),
  validateRequest(updateFollowUpSchema),
  followUpController.update
);

// 5. Lifecycle Action Endpoints
router.post(
  '/:id/complete',
  requirePermission('followups:complete'),
  denyDesignations('Accountant Office', 'HR Office', 'HR'),
  validateRequest(completeFollowUpSchema),
  followUpController.complete
);

router.post(
  '/:id/reschedule',
  requirePermission('followups:reschedule'),
  denyDesignations('Accountant Office', 'HR Office', 'HR'),
  validateRequest(rescheduleFollowUpSchema),
  followUpController.reschedule
);

router.post(
  '/:id/cancel',
  requirePermission('followups:cancel'),
  denyDesignations('Accountant Office', 'HR Office', 'HR'),
  validateRequest(cancelFollowUpSchema),
  followUpController.cancel
);

// 6. Delete Endpoint (Strictly Admin only)
router.delete(
  '/:id',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN),
  validateRequest(getFollowUpByIdSchema),
  followUpController.delete
);

export default router;
