import { pgTable, uuid, varchar, text, numeric, integer, date, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const attendance = pgTable(
  'attendance',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employee_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    attendanceDate: date('attendance_date', { mode: 'string' }).notNull(),
    checkInAt: timestamp('check_in_at', { withTimezone: true }).notNull(),
    checkInLatitude: numeric('check_in_latitude', { precision: 10, scale: 7 }),
    checkInLongitude: numeric('check_in_longitude', { precision: 10, scale: 7 }),
    checkOutAt: timestamp('check_out_at', { withTimezone: true }),
    checkOutLatitude: numeric('check_out_latitude', { precision: 10, scale: 7 }),
    checkOutLongitude: numeric('check_out_longitude', { precision: 10, scale: 7 }),
    totalMinutes: integer('total_minutes'),
    status: varchar('status', { length: 50 }).default('CHECKED_IN').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('attendance_employee_date_unique_idx').on(table.employeeId, table.attendanceDate),
    index('attendance_employee_id_idx').on(table.employeeId),
    index('attendance_date_idx').on(table.attendanceDate),
    index('attendance_status_idx').on(table.status),
    index('attendance_check_in_at_idx').on(table.checkInAt),
    index('attendance_created_at_idx').on(table.createdAt),
  ]
);

export type AttendanceEntity = typeof attendance.$inferSelect;
export type NewAttendanceEntity = typeof attendance.$inferInsert;
