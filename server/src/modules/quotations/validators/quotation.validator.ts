import { z } from 'zod';
import { APP_CONSTANTS } from '../../../config/constants.js';

export const lineItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID').optional().nullable(),
  itemType: z
    .enum([
      APP_CONSTANTS.QUOTATION_ITEM_TYPES.PRODUCT,
      APP_CONSTANTS.QUOTATION_ITEM_TYPES.SERVICE,
      APP_CONSTANTS.QUOTATION_ITEM_TYPES.AMC,
      APP_CONSTANTS.QUOTATION_ITEM_TYPES.CUSTOM,
    ])
    .optional()
    .default(APP_CONSTANTS.QUOTATION_ITEM_TYPES.PRODUCT),
  productName: z.string().min(1, 'Product name is required').max(255),
  productSku: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  make: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  technicalSpecifications: z.string().optional().nullable(),
  hsnSac: z.string().max(50).optional().nullable(),
  unit: z.string().max(50).optional().default('NOS'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
  discountPercent: z.coerce.number().min(0).max(100).optional().default(0),
  discountAmount: z.coerce.number().min(0).optional().default(0),
  gstRate: z.coerce.number().min(0).max(100).optional().default(18),
  serviceDurationMonths: z.coerce.number().int().min(0).optional().nullable(),
  serviceVisitsIncluded: z.coerce.number().int().min(0).optional().nullable(),
  serviceScope: z.string().optional().nullable(),
  equipmentType: z.string().max(100).optional().nullable(),
  equipmentConfiguration: z.string().max(100).optional().nullable(),
  equipmentRating: z.string().max(100).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const amcScopeItemSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().min(1, 'Scope description is required'),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const amcExclusionSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().min(1, 'Exclusion description is required'),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const amcEscalationSchema = z.object({
  id: z.string().uuid().optional(),
  level: z.enum(['LEVEL_1', 'LEVEL_2', 'LEVEL_3'], {
    errorMap: () => ({ message: 'Level must be LEVEL_1, LEVEL_2, or LEVEL_3' }),
  }),
  contactName: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email address').or(z.literal('')).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

const amcFieldsSchema = z.object({
  amcPlan: z.string().max(100).optional().nullable(),
  amcStartDate: z.string().optional().nullable(),
  amcEndDate: z.string().optional().nullable(),
  amcServiceFrequency: z.string().optional().nullable(),
  amcScheduledVisits: z.coerce.number().int().min(0).optional().nullable(),
  amcBreakdownVisitType: z.enum(['INCLUDED', 'LIMITED', 'UNLIMITED', 'NOT_INCLUDED']).or(z.string()).optional().nullable(),
  endUser: z.string().max(255).optional().nullable(),
  customerCode: z.string().max(100).optional().nullable(),
  branch: z.string().max(100).optional().nullable(),
  zone: z.string().max(100).optional().nullable(),
  specialClauses: z.string().optional().nullable(),
  amcPaymentTerms: z.string().optional().nullable(),
  amcScope: z.array(amcScopeItemSchema).optional().nullable(),
  amcExclusions: z.array(amcExclusionSchema).optional().nullable(),
  amcEscalations: z.array(amcEscalationSchema).optional().nullable(),
});

export const createQuotationSchema = z.object({
  body: z
    .object({
      quotationType: z
        .enum([
          APP_CONSTANTS.QUOTATION_TYPES.PRODUCT,
          APP_CONSTANTS.QUOTATION_TYPES.TECHNICAL,
          APP_CONSTANTS.QUOTATION_TYPES.SERVICE,
          APP_CONSTANTS.QUOTATION_TYPES.AMC,
        ])
        .optional()
        .default(APP_CONSTANTS.QUOTATION_TYPES.PRODUCT),
      customerId: z.string().uuid('Invalid customer ID'),
      destinationId: z.string().uuid('Invalid destination ID').optional().nullable(),
      quotationDate: z.string().optional(),
      validityDays: z.coerce.number().int().min(1).max(365).optional().default(30),
      currency: z.string().max(10).optional().default('INR'),
      subject: z.string().max(500).optional().nullable(),
      termsAndConditions: z.string().optional().nullable(),
      paymentTerms: z.string().optional().nullable(),
      deliveryTerms: z.string().optional().nullable(),
      warrantyTerms: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      internalRemarks: z.string().optional().nullable(),
      freightCharges: z.coerce.number().min(0).optional().default(0),
      otherCharges: z.coerce.number().min(0).optional().default(0),
      roundOff: z.coerce.number().optional(),
      items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
    })
    .merge(amcFieldsSchema)
    .superRefine((data, ctx) => {
      if (data.quotationType === APP_CONSTANTS.QUOTATION_TYPES.AMC) {
        if (data.amcStartDate && data.amcEndDate) {
          const start = new Date(data.amcStartDate);
          const end = new Date(data.amcEndDate);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'AMC End Date must be greater than or equal to AMC Start Date',
              path: ['amcEndDate'],
            });
          }
        }
      }
    }),
});

export const updateQuotationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid quotation ID'),
  }),
  body: z
    .object({
      quotationType: z
        .enum([
          APP_CONSTANTS.QUOTATION_TYPES.PRODUCT,
          APP_CONSTANTS.QUOTATION_TYPES.TECHNICAL,
          APP_CONSTANTS.QUOTATION_TYPES.SERVICE,
          APP_CONSTANTS.QUOTATION_TYPES.AMC,
        ])
        .optional(),
      destinationId: z.string().uuid('Invalid destination ID').optional().nullable(),
      quotationDate: z.string().optional(),
      validityDays: z.coerce.number().int().min(1).max(365).optional(),
      currency: z.string().max(10).optional(),
      subject: z.string().max(500).optional().nullable(),
      termsAndConditions: z.string().optional().nullable(),
      paymentTerms: z.string().optional().nullable(),
      deliveryTerms: z.string().optional().nullable(),
      warrantyTerms: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      internalRemarks: z.string().optional().nullable(),
      freightCharges: z.coerce.number().min(0).optional(),
      otherCharges: z.coerce.number().min(0).optional(),
      roundOff: z.coerce.number().optional(),
      items: z.array(lineItemSchema).min(1, 'At least one line item is required').optional(),
    })
    .merge(amcFieldsSchema)
    .superRefine((data, ctx) => {
      if (data.quotationType === APP_CONSTANTS.QUOTATION_TYPES.AMC) {
        if (data.amcStartDate && data.amcEndDate) {
          const start = new Date(data.amcStartDate);
          const end = new Date(data.amcEndDate);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'AMC End Date must be greater than or equal to AMC Start Date',
              path: ['amcEndDate'],
            });
          }
        }
      }
    }),
});

export const createRevisionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid quotation ID'),
  }),
  body: z
    .object({
      revisionReason: z.string().min(1, 'Revision reason is required'),
      quotationDate: z.string().optional(),
      validityDays: z.coerce.number().int().min(1).max(365).optional(),
      subject: z.string().max(500).optional().nullable(),
      termsAndConditions: z.string().optional().nullable(),
      paymentTerms: z.string().optional().nullable(),
      deliveryTerms: z.string().optional().nullable(),
      warrantyTerms: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      internalRemarks: z.string().optional().nullable(),
      freightCharges: z.coerce.number().min(0).optional(),
      otherCharges: z.coerce.number().min(0).optional(),
      roundOff: z.coerce.number().optional(),
      items: z.array(lineItemSchema).min(1, 'At least one line item is required').optional(),
    })
    .merge(amcFieldsSchema)
    .superRefine((data, ctx) => {
      if (data.amcStartDate && data.amcEndDate) {
        const start = new Date(data.amcStartDate);
        const end = new Date(data.amcEndDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'AMC End Date must be greater than or equal to AMC Start Date',
            path: ['amcEndDate'],
          });
        }
      }
    }),
});

export const submitQuotationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid quotation ID'),
  }),
  body: z
    .object({
      comments: z.string().optional(),
    })
    .optional(),
});

export const approveQuotationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid quotation ID'),
  }),
  body: z
    .object({
      comments: z.string().optional(),
    })
    .optional(),
});

export const rejectQuotationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid quotation ID'),
  }),
  body: z.object({
    rejectionReason: z.string().min(1, 'Rejection reason is required'),
  }),
});

export const withdrawQuotationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid quotation ID'),
  }),
  body: z
    .object({
      reason: z.string().optional(),
    })
    .optional(),
});

export const listQuotationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    search: z.string().optional(),
    status: z.string().optional(),
    quotationType: z.string().optional(),
    customerId: z.string().uuid().optional(),
    salespersonId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const getQuotationByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid quotation ID'),
  }),
});

export const getRevisionByNumberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid quotation ID'),
    revisionNumber: z.coerce.number().int().min(1, 'Revision number must be positive'),
  }),
});

export const sendQuotationEmailSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid quotation ID'),
  }),
  body: z
    .object({
      customEmail: z.string().email('Invalid target email address').optional().or(z.literal('')),
      customSubject: z.string().optional(),
      customNotes: z.string().optional(),
    })
    .optional(),
});

export type CreateQuotationDto = z.input<typeof createQuotationSchema>['body'];
export type UpdateQuotationDto = z.input<typeof updateQuotationSchema>['body'];
export type CreateRevisionDto = z.input<typeof createRevisionSchema>['body'];
export type SubmitQuotationDto = z.input<typeof submitQuotationSchema>['body'];
export type ApproveQuotationDto = z.input<typeof approveQuotationSchema>['body'];
export type RejectQuotationDto = z.input<typeof rejectQuotationSchema>['body'];
export type SendQuotationEmailDto = z.input<typeof sendQuotationEmailSchema>['body'];
export type ListQuotationsQueryDto = z.input<typeof listQuotationsSchema>['query'];


