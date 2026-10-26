import { z } from 'zod';
import { TASK_PRIORITY, TASK_STATUS } from '../constants/task.constants.js';

const parseDateOrNull = (val: unknown): Date | null | undefined => {
  if (val === undefined) return undefined;
  if (val === null || val === '') return null;
  const parsed = new Date(val as string);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
};

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Task title must be at least 2 characters long').max(255),
    description: z.string().optional().nullable(),
    customerId: z.string().uuid('Invalid customer ID format').optional().nullable(),
    destinationId: z.string().uuid('Invalid destination ID format').optional().nullable(),
    leadId: z.string().max(255).optional().nullable(),
    leadDestinationId: z.string().uuid('Invalid lead destination ID format').optional().nullable(),
    assignedTo: z.string().uuid('Invalid employee ID format').optional().nullable(),
    priority: z
      .enum([
        TASK_PRIORITY.LOW,
        TASK_PRIORITY.MEDIUM,
        TASK_PRIORITY.HIGH,
        TASK_PRIORITY.URGENT,
      ], {
        errorMap: () => ({ message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT' }),
      })
      .default(TASK_PRIORITY.MEDIUM),
    scheduledAt: z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .transform(parseDateOrNull),
    dueAt: z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .transform(parseDateOrNull),
    amcVisitId: z.string().uuid('Invalid AMC visit ID format').optional().nullable(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
    title: z.string().min(2, 'Task title must be at least 2 characters long').max(255).optional(),
    description: z.string().optional().nullable(),
    customerId: z.string().uuid('Invalid customer ID format').optional().nullable(),
    destinationId: z.string().uuid('Invalid destination ID format').optional().nullable(),
    leadId: z.string().max(255).optional().nullable(),
    leadDestinationId: z.string().uuid('Invalid lead destination ID format').optional().nullable(),
    assignedTo: z.string().uuid('Invalid employee ID format').optional().nullable(),
    priority: z
      .enum([
        TASK_PRIORITY.LOW,
        TASK_PRIORITY.MEDIUM,
        TASK_PRIORITY.HIGH,
        TASK_PRIORITY.URGENT,
      ], {
        errorMap: () => ({ message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT' }),
      })
      .optional(),
    status: z
      .enum([
        TASK_STATUS.CREATED,
        TASK_STATUS.ASSIGNED,
        TASK_STATUS.IN_PROGRESS,
        TASK_STATUS.COMPLETED,
        TASK_STATUS.CANCELLED,
      ], {
        errorMap: () => ({ message: 'Invalid task status' }),
      })
      .optional(),
    scheduledAt: z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .transform(parseDateOrNull),
    dueAt: z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .transform(parseDateOrNull),
  }),
});

export const cancelTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
    cancellationReason: z
      .string()
      .min(3, 'Cancellation reason must be at least 3 characters long')
      .max(1000),
  }),
});

export const getTaskByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
});

export const deleteTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
});

export const listTasksSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assignedTo: z.string().optional(),
    customerId: z.string().optional(),
    scheduledDate: z.string().optional(),
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

export const startTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
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
  }).optional(),
});

export const updateTaskLocationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
    latitude: z
      .number({ required_error: 'Latitude is required' })
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
    longitude: z
      .number({ required_error: 'Longitude is required' })
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
    accuracy: z.number().min(0).optional().nullable(),
    timestamp: z.number().optional().nullable(),
  }),
});

export const completeTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
    notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional().nullable(),
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
  }).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>['body'];
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>['body'];
export type CancelTaskInput = z.infer<typeof cancelTaskSchema>['body'];
export type StartTaskInput = z.infer<typeof startTaskSchema>['body'];
export type UpdateTaskLocationInput = z.infer<typeof updateTaskLocationSchema>['body'];
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>['body'];
export type ListTasksQuery = z.infer<typeof listTasksSchema>['query'];
