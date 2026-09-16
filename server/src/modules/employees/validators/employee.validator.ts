import { z } from 'zod';
import { APP_CONSTANTS } from '../../../config/constants.js';

export const createEmployeeSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters long'),
    email: z.string().email('Invalid email address'),
    phone: z.string().max(50, 'Phone number must not exceed 50 characters').optional().nullable(),
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
  }),
});

export const updateEmployeeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID format'),
  }),
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters long').optional(),
    phone: z.string().max(50, 'Phone number must not exceed 50 characters').optional().nullable(),
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
  }),
});

export const listEmployeesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    role: z.string().optional(),
    status: z.string().optional(),
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
