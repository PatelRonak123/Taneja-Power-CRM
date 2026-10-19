import { z } from 'zod';
import { FOLLOW_UP_PRIORITY, FOLLOW_UP_TYPE } from '../constants/follow-up.constants.js';

const typeValues = Object.values(FOLLOW_UP_TYPE) as [string, ...string[]];
const priorityValues = Object.values(FOLLOW_UP_PRIORITY) as [string, ...string[]];

export const createFollowUpSchema = z.object({
  body: z
    .object({
      title: z.string().min(2, 'Title must be at least 2 characters long').max(255),
      description: z.string().optional().nullable(),
      type: z.enum(typeValues, {
        errorMap: () => ({ message: `Invalid follow-up type. Valid types: ${typeValues.join(', ')}` }),
      }),
      priority: z.enum(priorityValues).default(FOLLOW_UP_PRIORITY.MEDIUM),
      scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Scheduled date must be in YYYY-MM-DD format'),
      scheduledTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Scheduled time must be in HH:mm format')
        .optional()
        .nullable(),
      assignedTo: z.string().uuid('Invalid assigned employee ID').optional().nullable(),

      // Related entities (at least one must be provided)
      customerId: z.string().uuid('Invalid customer ID format').optional().nullable(),
      leadId: z.string().min(1).max(255).optional().nullable(),
      dealId: z.string().min(1).max(255).optional().nullable(),
      quotationId: z.string().uuid('Invalid quotation ID format').optional().nullable(),
      amcContractId: z.string().uuid('Invalid AMC contract ID format').optional().nullable(),
      customerEquipmentId: z.string().uuid('Invalid customer equipment ID format').optional().nullable(),
      warrantyCycle: z.string().max(50).optional().nullable(),
      contactMethod: z.enum(['PHONE', 'EMAIL', 'WHATSAPP', 'IN_PERSON', 'SITE_VISIT']).optional().nullable(),
    })
    .refine(
      (data) =>
        Boolean(
          data.customerId ||
          data.leadId ||
          data.dealId ||
          data.quotationId ||
          data.amcContractId ||
          data.customerEquipmentId
        ),
      {
        message: 'A follow-up must be associated with at least one CRM record (Customer, Lead, Deal, Quotation, AMC Contract, or Customer Equipment).',
        path: ['customerId'],
      }
    ),
});

export const updateFollowUpSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid follow-up ID format'),
  }),
  body: z.object({
    title: z.string().min(2, 'Title must be at least 2 characters long').max(255).optional(),
    description: z.string().optional().nullable(),
    type: z.enum(typeValues).optional(),
    priority: z.enum(priorityValues).optional(),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Scheduled date must be in YYYY-MM-DD format').optional(),
    scheduledTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Scheduled time must be in HH:mm format')
      .optional()
      .nullable(),
    assignedTo: z.string().uuid('Invalid assigned employee ID').optional().nullable(),
    customerId: z.string().uuid('Invalid customer ID format').optional().nullable(),
    leadId: z.string().min(1).max(255).optional().nullable(),
    dealId: z.string().min(1).max(255).optional().nullable(),
    quotationId: z.string().uuid('Invalid quotation ID format').optional().nullable(),
    amcContractId: z.string().uuid('Invalid AMC contract ID format').optional().nullable(),
  }),
});

export const completeFollowUpSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid follow-up ID format'),
  }),
  body: z.object({
    outcome: z.string().min(1, 'Outcome / notes is required when completing a follow-up'),
    notes: z.string().optional().nullable(),
    // Optional automatic next follow-up creation
    createNextFollowUp: z.boolean().optional(),
    nextFollowUpDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Next follow-up date must be in YYYY-MM-DD format')
      .optional()
      .nullable(),
    nextFollowUpTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Next follow-up time must be in HH:mm format')
      .optional()
      .nullable(),
    nextFollowUpTitle: z.string().max(255).optional().nullable(),
    nextFollowUpType: z.enum(typeValues).optional().nullable(),
    nextFollowUpNotes: z.string().optional().nullable(),
  }),
});

export const rescheduleFollowUpSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid follow-up ID format'),
  }),
  body: z.object({
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Scheduled date must be in YYYY-MM-DD format'),
    scheduledTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Scheduled time must be in HH:mm format')
      .optional()
      .nullable(),
    reason: z.string().optional().nullable(),
  }),
});

export const cancelFollowUpSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid follow-up ID format'),
  }),
  body: z.object({
    reason: z.string().optional().nullable(),
  }),
});

export const getFollowUpByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid follow-up ID format'),
  }),
});

export const listFollowUpsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    status: z.string().optional(),
    tab: z.enum(['all', 'today', 'upcoming', 'overdue', 'completed']).optional(),
    type: z.string().optional(),
    priority: z.string().optional(),
    assignedTo: z.string().optional(),
    customerId: z.string().optional(),
    leadId: z.string().optional(),
    dealId: z.string().optional(),
    quotationId: z.string().optional(),
    amcContractId: z.string().optional(),
    customerEquipmentId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>['body'];
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>['body'];
export type CompleteFollowUpInput = z.infer<typeof completeFollowUpSchema>['body'];
export type RescheduleFollowUpInput = z.infer<typeof rescheduleFollowUpSchema>['body'];
export type CancelFollowUpInput = z.infer<typeof cancelFollowUpSchema>['body'];
export type ListFollowUpsQuery = z.infer<typeof listFollowUpsSchema>['query'];
