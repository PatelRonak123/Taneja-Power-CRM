import { z } from 'zod';
import { APP_CONSTANTS, WorkType } from '../../../config/constants.js';

export function isValidDesignationForWorkType(workType: string, designation?: string | null, role?: string): boolean {
  if (!designation || designation.trim() === '') return true;
  const d = designation.trim();

  if (workType === APP_CONSTANTS.WORK_TYPES.OFFICE) {
    const isOfficeDesig = (APP_CONSTANTS.DESIGNATIONS.OFFICE as readonly string[]).includes(d);
    if (isOfficeDesig) return true;
    // Admins and Managers can have executive/operations designations
    if (role === APP_CONSTANTS.ROLES.ADMIN || role === APP_CONSTANTS.ROLES.MANAGER) {
      return true;
    }
    return false;
  }

  if (workType === APP_CONSTANTS.WORK_TYPES.FIELD) {
    const isFieldDesig = (APP_CONSTANTS.DESIGNATIONS.FIELD as readonly string[]).includes(d);
    const isLegacyService = (APP_CONSTANTS.DESIGNATIONS.LEGACY_FIELD_SERVICE as readonly string[]).includes(d);
    const isLegacySales = (APP_CONSTANTS.DESIGNATIONS.LEGACY_FIELD_SALES as readonly string[]).includes(d);
    return isFieldDesig || isLegacyService || isLegacySales;
  }

  return false;
}

export const createEmployeeSchema = z.object({
  body: z
    .object({
      fullName: z.string().min(2, 'Full name must be at least 2 characters long'),
      email: z
        .string()
        .max(255, 'Email field must not exceed 255 characters')
        .refine(
          (val) => {
            const parts = val.split(',').map((p) => p.trim()).filter(Boolean);
            if (parts.length === 0) return false;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return parts.every((email) => emailRegex.test(email));
          },
          { message: 'Invalid email address or format. Please ensure all email addresses are valid.' }
        ),
      phone: z.string().max(255, 'Phone number must not exceed 255 characters').optional().nullable(),
      workType: z
        .enum([APP_CONSTANTS.WORK_TYPES.OFFICE, APP_CONSTANTS.WORK_TYPES.FIELD], {
          errorMap: () => ({ message: 'Work type must be OFFICE or FIELD' }),
        })
        .default(APP_CONSTANTS.WORK_TYPES.OFFICE),
      designation: z.string().max(100, 'Designation must not exceed 100 characters').optional().nullable(),
      password: z.string().min(6, 'Password must be at least 6 characters long'),
      role: z.enum([APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER, APP_CONSTANTS.ROLES.USER], {
        errorMap: () => ({ message: 'Role must be ADMIN, MANAGER, or USER' }),
      }),
      status: z
        .enum([APP_CONSTANTS.STATUS.ACTIVE, APP_CONSTANTS.STATUS.INACTIVE], {
          errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }),
        })
        .default(APP_CONSTANTS.STATUS.ACTIVE),
      avatarUrl: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
    })
    .superRefine((data, ctx) => {
      if (!isValidDesignationForWorkType(data.workType, data.designation, data.role)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid designation "${data.designation}" for workType "${data.workType}". Valid combinations for OFFICE: ${APP_CONSTANTS.DESIGNATIONS.OFFICE.join(', ')}. Valid combinations for FIELD: ${APP_CONSTANTS.DESIGNATIONS.FIELD.join(', ')}.`,
          path: ['designation'],
        });
      }
    }),
});

export const updateEmployeeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID format'),
  }),
  body: z
    .object({
      fullName: z.string().min(2, 'Full name must be at least 2 characters long').optional(),
      phone: z.string().max(255, 'Phone number must not exceed 255 characters').optional().nullable(),
      workType: z
        .enum([APP_CONSTANTS.WORK_TYPES.OFFICE, APP_CONSTANTS.WORK_TYPES.FIELD], {
          errorMap: () => ({ message: 'Work type must be OFFICE or FIELD' }),
        })
        .optional(),
      designation: z.string().max(100, 'Designation must not exceed 100 characters').optional().nullable(),
      role: z
        .enum([APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER, APP_CONSTANTS.ROLES.USER], {
          errorMap: () => ({ message: 'Role must be ADMIN, MANAGER, or USER' }),
        })
        .optional(),
      status: z
        .enum([APP_CONSTANTS.STATUS.ACTIVE, APP_CONSTANTS.STATUS.INACTIVE], {
          errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }),
        })
        .optional(),
      avatarUrl: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
    })
    .superRefine((data, ctx) => {
      if (data.workType && data.designation !== undefined) {
        if (!isValidDesignationForWorkType(data.workType, data.designation, data.role)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid designation "${data.designation}" for workType "${data.workType}". Valid combinations for OFFICE: ${APP_CONSTANTS.DESIGNATIONS.OFFICE.join(', ')}. Valid combinations for FIELD: ${APP_CONSTANTS.DESIGNATIONS.FIELD.join(', ')}.`,
            path: ['designation'],
          });
        }
      }
    }),
});

export const listEmployeesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    role: z.string().optional(),
    status: z.string().optional(),
    workType: z.string().optional(),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10)),
  }),
});

export const getEmployeeByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID format'),
  }),
});

export const deleteEmployeeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID format'),
  }),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>['body'];
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>['body'];
export type ListEmployeesQuery = z.infer<typeof listEmployeesSchema>['query'];
