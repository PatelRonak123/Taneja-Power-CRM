import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requireRoles } from '../../../common/middleware/auth.middleware.js';
import {
  checkInSchema,
  checkOutSchema,
  listAttendanceSchema,
  getAttendanceByIdSchema,
  getAttendanceByEmployeeSchema,
} from '../validators/attendance.validator.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const router = Router();
const attendanceController = new AttendanceController();

// All attendance routes require authentication
router.use(authenticate);

// 1. Employee Endpoints (for Mobile Sales Person app & field staff)
router.post('/check-in', validateRequest(checkInSchema), attendanceController.checkIn);
router.post('/check-out', validateRequest(checkOutSchema), attendanceController.checkOut);
router.get('/me', attendanceController.getMyAttendance);
router.get('/my-history', attendanceController.getMyHistory);

// 2. Admin, Manager & HR Analytics / Monitoring Endpoints
router.get(
  '/metrics',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER, APP_CONSTANTS.ROLES.HR),
  attendanceController.getMetrics
);
router.get(
  '/currently-checked-in',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER, APP_CONSTANTS.ROLES.HR),
  attendanceController.getCurrentlyCheckedIn
);
router.get(
  '/employee/:employeeId',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER, APP_CONSTANTS.ROLES.HR),
  validateRequest(getAttendanceByEmployeeSchema),
  attendanceController.getByEmployee
);

// 3. Attendance List (Admin, Manager & HR)
router.get(
  '/',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER, APP_CONSTANTS.ROLES.HR),
  validateRequest(listAttendanceSchema),
  attendanceController.list
);

// 4. Attendance Details & Update
router.get('/:id', validateRequest(getAttendanceByIdSchema), attendanceController.getById);
router.put(
  '/:id',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER, APP_CONSTANTS.ROLES.HR),
  attendanceController.updateAttendance
);

export default router;
