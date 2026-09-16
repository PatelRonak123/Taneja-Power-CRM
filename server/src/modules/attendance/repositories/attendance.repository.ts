import { eq, and, or, ilike, count, desc, asc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { attendance, AttendanceEntity, NewAttendanceEntity } from '../../../database/schema/attendance.js';
import { users, UserEntity } from '../../../database/schema/users.js';

export interface AttendanceFilterOptions {
  employeeId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AttendanceEmployeeSummary {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  designation?: string | null;
  avatarUrl?: string | null;
  status: string;
  role: string;
}

export interface AttendanceWithEmployee extends AttendanceEntity {
  employee: AttendanceEmployeeSummary;
}

export interface AttendanceMetricsDto {
  totalEmployees: number;
  checkedIn: number;
  checkedOut: number;
  notCheckedIn: number;
}

export class AttendanceRepository {
  async findAll(
    options: AttendanceFilterOptions = {}
  ): Promise<{ data: AttendanceWithEmployee[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (options.employeeId && options.employeeId.trim() !== '' && options.employeeId.trim() !== 'ALL') {
      conditions.push(eq(attendance.employeeId, options.employeeId.trim()));
    }

    if (options.status && options.status.trim() !== '' && options.status.trim() !== 'ALL') {
      conditions.push(eq(attendance.status, options.status.trim()));
    }

    if (options.date && options.date.trim() !== '') {
      conditions.push(eq(attendance.attendanceDate, options.date.trim()));
    } else {
      if (options.startDate && options.startDate.trim() !== '') {
        conditions.push(gte(attendance.attendanceDate, options.startDate.trim()));
      }
      if (options.endDate && options.endDate.trim() !== '') {
        conditions.push(lte(attendance.attendanceDate, options.endDate.trim()));
      }
    }

    if (options.search && options.search.trim() !== '') {
      const searchPattern = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(users.fullName, searchPattern),
          ilike(users.email, searchPattern),
          ilike(users.phone, searchPattern),
          ilike(users.designation, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count query
    const [countResult] = await db
      .select({ value: count() })
      .from(attendance)
      .innerJoin(users, eq(attendance.employeeId, users.id))
      .where(whereClause);

    const total = Number(countResult?.value || 0);

    // Records query
    const rows = await db
      .select({
        record: attendance,
        employee: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          designation: users.designation,
          avatarUrl: users.avatarUrl,
          status: users.status,
          role: users.role,
        },
      })
      .from(attendance)
      .innerJoin(users, eq(attendance.employeeId, users.id))
      .where(whereClause)
      .orderBy(desc(attendance.checkInAt))
      .limit(limit)
      .offset(offset);

    const data: AttendanceWithEmployee[] = rows.map((r) => ({
      ...r.record,
      employee: r.employee,
    }));

    return { data, total };
  }

  async findById(id: string): Promise<AttendanceWithEmployee | undefined> {
    const rows = await db
      .select({
        record: attendance,
        employee: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          designation: users.designation,
          avatarUrl: users.avatarUrl,
          status: users.status,
          role: users.role,
        },
      })
      .from(attendance)
      .innerJoin(users, eq(attendance.employeeId, users.id))
      .where(eq(attendance.id, id))
      .limit(1);

    if (!rows[0]) return undefined;

    return {
      ...rows[0].record,
      employee: rows[0].employee,
    };
  }

  async findByEmployeeAndDate(
    employeeId: string,
    attendanceDate: string
  ): Promise<AttendanceEntity | undefined> {
    const result = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, employeeId),
          eq(attendance.attendanceDate, attendanceDate)
        )
      )
      .limit(1);

    return result[0];
  }

  async findActiveAttendance(
    employeeId: string,
    attendanceDate: string
  ): Promise<AttendanceEntity | undefined> {
    const result = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, employeeId),
          eq(attendance.attendanceDate, attendanceDate),
          eq(attendance.status, 'CHECKED_IN')
        )
      )
      .limit(1);

    return result[0];
  }

  async create(data: NewAttendanceEntity): Promise<AttendanceEntity> {
    const result = await db.insert(attendance).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<NewAttendanceEntity>): Promise<AttendanceEntity | undefined> {
    const result = await db
      .update(attendance)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(attendance.id, id))
      .returning();

    return result[0];
  }

  async getMetrics(date: string): Promise<AttendanceMetricsDto> {
    // Total active employees
    const [activeEmployeesResult] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.status, 'ACTIVE'));

    const totalEmployees = Number(activeEmployeesResult?.value || 0);

    // Checked in count on date
    const [checkedInResult] = await db
      .select({ value: count() })
      .from(attendance)
      .innerJoin(users, eq(attendance.employeeId, users.id))
      .where(
        and(
          eq(attendance.attendanceDate, date),
          eq(attendance.status, 'CHECKED_IN'),
          eq(users.status, 'ACTIVE')
        )
      );

    const checkedIn = Number(checkedInResult?.value || 0);

    // Checked out count on date
    const [checkedOutResult] = await db
      .select({ value: count() })
      .from(attendance)
      .innerJoin(users, eq(attendance.employeeId, users.id))
      .where(
        and(
          eq(attendance.attendanceDate, date),
          eq(attendance.status, 'CHECKED_OUT'),
          eq(users.status, 'ACTIVE')
        )
      );

    const checkedOut = Number(checkedOutResult?.value || 0);
    const notCheckedIn = Math.max(0, totalEmployees - (checkedIn + checkedOut));

    return {
      totalEmployees,
      checkedIn,
      checkedOut,
      notCheckedIn,
    };
  }

  async getCurrentlyCheckedIn(date: string): Promise<AttendanceWithEmployee[]> {
    const rows = await db
      .select({
        record: attendance,
        employee: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          designation: users.designation,
          avatarUrl: users.avatarUrl,
          status: users.status,
          role: users.role,
        },
      })
      .from(attendance)
      .innerJoin(users, eq(attendance.employeeId, users.id))
      .where(
        and(
          eq(attendance.attendanceDate, date),
          eq(attendance.status, 'CHECKED_IN'),
          eq(users.status, 'ACTIVE')
        )
      )
      .orderBy(asc(attendance.checkInAt));

    return rows.map((r) => ({
      ...r.record,
      employee: r.employee,
    }));
  }
}
