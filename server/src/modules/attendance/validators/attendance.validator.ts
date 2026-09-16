import { z } from 'zod';
import { ATTENDANCE_STATUS } from '../constants/attendance.constants.js';

const coordinateValidation = (data: { latitude?: number | null; longitude?: number | null }, ctx: z.RefinementCtx) => {
  const hasLat = data.latitude !== undefined && data.latitude !== null;
  const hasLng = data.longitude !== undefined && data.longitude !== null;

  if (hasLat && !hasLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Longitude is required when latitude is provided',
      path: ['longitude'],
    });
  }

  if (!hasLat && hasLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Latitude is required when longitude is provided',
      path: ['latitude'],
    });
  }
};

export const checkInSchema = z.object({
  body: z
    .object({
      latitude: z
        .number()
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90')
        .optional()
        .nullable(),
      longitude: z
        .number()
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180')
        .optional()
        .nullable(),
      notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
    })
    .superRefine(coordinateValidation),
});

export const checkOutSchema = z.object({
  body: z
    .object({
      latitude: z
        .number()
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90')
        .optional()
        .nullable(),
      longitude: z
        .number()
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180')
        .optional()
        .nullable(),
      notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
    })
    .superRefine(coordinateValidation),
});

export const listAttendanceSchema = z.object({
  query: z.object({
    employeeId: z.string().uuid('Invalid employee ID').optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
    status: z.enum([ATTENDANCE_STATUS.CHECKED_IN, ATTENDANCE_STATUS.CHECKED_OUT, 'ALL']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),
});

export const getAttendanceByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attendance ID'),
  }),
});

export const getAttendanceByEmployeeSchema = z.object({
  params: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
  }),
  query: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),
});

export type CheckInInput = z.infer<typeof checkInSchema>['body'];
export type CheckOutInput = z.infer<typeof checkOutSchema>['body'];
export type ListAttendanceQuery = z.infer<typeof listAttendanceSchema>['query'];
