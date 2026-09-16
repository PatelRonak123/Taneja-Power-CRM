import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendance.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';
import { AppError } from '../../../common/errors/AppError.js';

export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService = new AttendanceService()) {}

  checkIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employeeId = req.user?.userId;
      if (!employeeId) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.attendanceService.checkIn(employeeId, req.body);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.CREATED,
        result,
        'Attendance check-in recorded successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  checkOut = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employeeId = req.user?.userId;
      if (!employeeId) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.attendanceService.checkOut(employeeId, req.body);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Attendance check-out recorded successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  getMyAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employeeId = req.user?.userId;
      if (!employeeId) {
        throw AppError.unauthorized('User not authenticated');
      }

      const targetDate = typeof req.query.date === 'string' ? req.query.date : undefined;
      const result = await this.attendanceService.getMyAttendance(employeeId, targetDate);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Employee attendance retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.attendanceService.listAttendance(req.query as any);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result.attendance,
        'Attendance records retrieved successfully',
        {
          ...result.pagination,
          metrics: result.metrics,
        }
      );
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.attendanceService.getAttendanceById(req.params.id);

      // If user is non-admin/manager, verify they are only viewing their own record
      if (
        req.user &&
        req.user.role === APP_CONSTANTS.ROLES.USER &&
        result.employeeId !== req.user.userId
      ) {
        throw AppError.forbidden('You do not have permission to view this attendance record');
      }

      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Attendance details retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  getMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const result = await this.attendanceService.getMetrics(date);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Attendance metrics retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  getCurrentlyCheckedIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const result = await this.attendanceService.getCurrentlyCheckedIn(date);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Currently checked-in employees retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  getByEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate, page, limit } = req.query as any;
      const result = await this.attendanceService.listAttendance({
        employeeId,
        startDate,
        endDate,
        page,
        limit,
      });

      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result.attendance,
        'Employee attendance history retrieved successfully',
        {
          ...result.pagination,
          metrics: result.metrics,
        }
      );
    } catch (error) {
      next(error);
    }
  };
}
