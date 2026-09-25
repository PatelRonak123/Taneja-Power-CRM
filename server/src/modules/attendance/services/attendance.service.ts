import {
  AttendanceRepository,
  AttendanceFilterOptions,
  AttendanceWithEmployee,
  AttendanceMetricsDto,
} from '../repositories/attendance.repository.js';
import { EmployeeRepository } from '../../employees/repositories/employee.repository.js';
import { CheckInInput, CheckOutInput } from '../validators/attendance.validator.js';
import { ATTENDANCE_STATUS, ATTENDANCE_CONSTANTS } from '../constants/attendance.constants.js';
import { AppError } from '../../../common/errors/AppError.js';
import { AttendanceEntity } from '../../../database/schema/attendance.js';

export class AttendanceService {
  constructor(
    private readonly attendanceRepo: AttendanceRepository = new AttendanceRepository(),
    private readonly employeeRepo: EmployeeRepository = new EmployeeRepository()
  ) {}

  /**
   * Helper to get current date in Asia/Kolkata timezone formatted as YYYY-MM-DD
   */
  getTodayDateString(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ATTENDANCE_CONSTANTS.TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  async checkIn(employeeId: string, input: CheckInInput): Promise<AttendanceEntity> {
    // 1. Verify employee exists and is active
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw AppError.notFound('Employee account not found');
    }
    if (employee.status !== 'ACTIVE') {
      throw AppError.badRequest('Inactive employee accounts cannot perform attendance check-in');
    }

    const todayDate = this.getTodayDateString();

    // 2. Check for existing attendance record for today
    const existing = await this.attendanceRepo.findByEmployeeAndDate(employeeId, todayDate);
    if (existing) {
      if (existing.status === ATTENDANCE_STATUS.CHECKED_IN) {
        throw AppError.conflict('You are already checked in for today');
      }
      if (existing.status === ATTENDANCE_STATUS.CHECKED_OUT) {
        throw AppError.conflict('You have already completed attendance check-out for today');
      }
    }

    // 3. Create attendance record with server-generated timestamp
    const checkInAt = new Date();
    return this.attendanceRepo.create({
      employeeId,
      attendanceDate: todayDate,
      checkInAt,
      checkInLatitude: input.latitude !== undefined && input.latitude !== null ? String(input.latitude) : null,
      checkInLongitude: input.longitude !== undefined && input.longitude !== null ? String(input.longitude) : null,
      status: ATTENDANCE_STATUS.CHECKED_IN,
      notes: input.notes || null,
    });
  }

  async checkOut(employeeId: string, input: CheckOutInput): Promise<AttendanceEntity> {
    // 1. Verify employee exists and is active
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw AppError.notFound('Employee account not found');
    }
    if (employee.status !== 'ACTIVE') {
      throw AppError.badRequest('Inactive employee accounts cannot perform attendance check-out');
    }

    const todayDate = this.getTodayDateString();

    // 2. Find today's attendance record
    const existing = await this.attendanceRepo.findByEmployeeAndDate(employeeId, todayDate);
    if (!existing) {
      throw AppError.badRequest('No active attendance record found for today. Please check in first.');
    }

    if (existing.status === ATTENDANCE_STATUS.CHECKED_OUT) {
      throw AppError.badRequest('You have already checked out for today.');
    }

    // 3. Compute server-side checkout timestamp and duration in total minutes
    const checkOutAt = new Date();
    const checkInTime = new Date(existing.checkInAt).getTime();
    const checkOutTime = checkOutAt.getTime();
    const diffMs = Math.max(0, checkOutTime - checkInTime);
    const totalMinutes = Math.round(diffMs / (1000 * 60));

    const updatedNotes = input.notes
      ? existing.notes
        ? `${existing.notes} | ${input.notes}`
        : input.notes
      : existing.notes;

    const updated = await this.attendanceRepo.update(existing.id, {
      checkOutAt,
      checkOutLatitude: input.latitude !== undefined && input.latitude !== null ? String(input.latitude) : null,
      checkOutLongitude: input.longitude !== undefined && input.longitude !== null ? String(input.longitude) : null,
      totalMinutes,
      status: ATTENDANCE_STATUS.CHECKED_OUT,
      notes: updatedNotes,
    });

    if (!updated) {
      throw AppError.internal('Failed to record check-out');
    }

    return updated;
  }

  async getMyAttendance(
    employeeId: string,
    targetDate?: string
  ): Promise<{
    todayRecord: AttendanceEntity | null;
    status: 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'CHECKED_OUT';
    date: string;
  }> {
    const date = targetDate || this.getTodayDateString();
    const record = await this.attendanceRepo.findByEmployeeAndDate(employeeId, date);

    let status: 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'CHECKED_OUT' = 'NOT_CHECKED_IN';
    if (record) {
      status = record.status as 'CHECKED_IN' | 'CHECKED_OUT';
    }

    return {
      todayRecord: record || null,
      status,
      date,
    };
  }

  async listAttendance(options: AttendanceFilterOptions) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const metricsDate = options.date || this.getTodayDateString();

    const [{ data, total }, metrics] = await Promise.all([
      this.attendanceRepo.findAll(options),
      this.attendanceRepo.getMetrics(metricsDate),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      attendance: data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      metrics,
    };
  }

  async getAttendanceById(id: string): Promise<AttendanceWithEmployee> {
    const record = await this.attendanceRepo.findById(id);
    if (!record) {
      throw AppError.notFound('Attendance record not found');
    }
    return record;
  }

  async getMetrics(date?: string): Promise<AttendanceMetricsDto> {
    const targetDate = date || this.getTodayDateString();
    return this.attendanceRepo.getMetrics(targetDate);
  }

  async getCurrentlyCheckedIn(date?: string): Promise<AttendanceWithEmployee[]> {
    const targetDate = date || this.getTodayDateString();
    return this.attendanceRepo.getCurrentlyCheckedIn(targetDate);
  }

  async updateAttendance(id: string, updates: Partial<AttendanceEntity>): Promise<AttendanceEntity> {
    const existing = await this.attendanceRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Attendance record not found');
    }

    let checkInAt = updates.checkInAt ? new Date(updates.checkInAt) : new Date(existing.checkInAt);
    let checkOutAt = updates.checkOutAt !== undefined
      ? (updates.checkOutAt ? new Date(updates.checkOutAt) : null)
      : (existing.checkOutAt ? new Date(existing.checkOutAt) : null);

    let totalMinutes = existing.totalMinutes;
    if (checkInAt && checkOutAt) {
      const diffMs = Math.max(0, checkOutAt.getTime() - checkInAt.getTime());
      totalMinutes = Math.round(diffMs / (1000 * 60));
    } else if (!checkOutAt) {
      totalMinutes = null;
    }

    const updated = await this.attendanceRepo.update(id, {
      status: updates.status || existing.status,
      checkInAt: updates.checkInAt ? checkInAt : undefined,
      checkOutAt: updates.checkOutAt !== undefined ? checkOutAt : undefined,
      totalMinutes,
      notes: updates.notes !== undefined ? updates.notes : existing.notes,
    });

    if (!updated) {
      throw AppError.internal('Failed to update attendance record');
    }

    return updated;
  }
}
