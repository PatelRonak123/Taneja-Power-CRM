import { z } from 'zod';
import { APP_CONSTANTS } from '../../../config/constants.js';

// Battery Reading Schema (Single Cell)
export const batteryReadingSchema = z.object({
  batteryNumber: z.coerce.number().int().min(1, 'Battery number must be at least 1'),
  chargingVoltage: z.coerce.number().min(0, 'Charging voltage cannot be negative').optional().nullable(),
  dischargingVoltage: z.coerce.number().min(0, 'Discharging voltage cannot be negative').optional().nullable(),
  internalResistance: z.coerce.number().min(0, 'Internal resistance cannot be negative').optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

// Battery Bank Schema (One or more banks per report)
export const batteryBankSchema = z.object({
  bankNumber: z.coerce.number().int().min(1).optional().default(1),
  bankDescription: z.string().max(255).optional().nullable(),
  make: z.string().max(100).optional().nullable(),
  ah: z.string().max(50).optional().nullable(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').optional().default(20),
  frontIndication: z.string().max(100).optional().nullable(),
  voltage: z.coerce.number().min(0).optional().nullable(),
  chargingCurrent: z.coerce.number().min(0).optional().nullable(),
  dischargingCurrent: z.coerce.number().min(0).optional().nullable(),
  remarks: z.string().optional().nullable(),
  readings: z.array(batteryReadingSchema).optional().default([]),
});

// Site Observation Schema
export const siteObservationSchema = z.object({
  inputOnMains: z.string().max(50).optional().nullable(),
  inputVoltageLN: z.coerce.number().optional().nullable(),
  inputVoltageLL: z.coerce.number().optional().nullable(),
  outputVoltageLN: z.coerce.number().optional().nullable(),
  outputVoltageLL: z.coerce.number().optional().nullable(),
  vac: z.coerce.number().optional().nullable(),
  frequency: z.coerce.number().optional().nullable(),
  dcVoltage: z.coerce.number().optional().nullable(),
  outputLoadPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  inputFrequency: z.coerce.number().optional().nullable(),
  outputFrequency: z.coerce.number().optional().nullable(),
  environmentCondition: z.string().max(20).optional().nullable(),
  environmentRemarks: z.string().optional().nullable(),
  upsLocation: z
    .enum([
      APP_CONSTANTS.FSR_UPS_LOCATIONS.COMPUTER_ROOM,
      APP_CONSTANTS.FSR_UPS_LOCATIONS.ELECTRICAL_ROOM,
      APP_CONSTANTS.FSR_UPS_LOCATIONS.NETWORK_ROOM,
      APP_CONSTANTS.FSR_UPS_LOCATIONS.OTHER,
    ])
    .optional()
    .nullable(),
  otherLocationSpecification: z.string().max(255).optional().nullable(),
  observationsNotes: z.string().optional().nullable(),
});

// Part Replacement Item Schema
export const partReplacementSchema = z.object({
  productId: z.string().uuid('Invalid product ID').optional().nullable(),
  partName: z.string().min(1, 'Part name is required').max(255),
  partNumber: z.string().max(100).optional().nullable(),
  quantity: z.coerce.number().positive('Quantity must be greater than 0').optional().default(1),
  replacementDetails: z.string().optional().nullable(),
  oldPartStatus: z.string().max(50).optional().nullable(),
  remarks: z.string().optional().nullable(),
});

// Customer Sign-off Schema
export const customerSignOffSchema = z.object({
  customerContactName: z.string().min(1, 'Customer contact person name is required').max(255),
  customerSignature: z.string().min(1, 'Customer signature is required'),
  customerStamp: z.string().optional().nullable(),
  customerSignedAt: z.string().optional().nullable(),
});

// FSE Sign-off Schema
export const fseSignOffSchema = z.object({
  fseName: z.string().min(1, 'FSE name is required').max(255),
  fseNumber: z.string().max(50).optional().nullable(),
  fseSignature: z.string().min(1, 'FSE signature is required'),
  fseSignatureDate: z.string().optional().nullable(),
});

// Attachment Upload Schema
export const attachmentUploadSchema = z.object({
  category: z
    .enum([
      APP_CONSTANTS.FSR_ATTACHMENT_CATEGORIES.UPS_PHOTO,
      APP_CONSTANTS.FSR_ATTACHMENT_CATEGORIES.BATTERY_PHOTO,
      APP_CONSTANTS.FSR_ATTACHMENT_CATEGORIES.SITE_PHOTO,
      APP_CONSTANTS.FSR_ATTACHMENT_CATEGORIES.PART_PHOTO,
      APP_CONSTANTS.FSR_ATTACHMENT_CATEGORIES.SIGNED_DOCUMENT,
      APP_CONSTANTS.FSR_ATTACHMENT_CATEGORIES.OTHER,
    ])
    .optional()
    .default(APP_CONSTANTS.FSR_ATTACHMENT_CATEGORIES.OTHER),
  fileName: z.string().min(1, 'File name is required').max(255),
  fileData: z.string().min(1, 'File data (base64 or payload) is required'),
  fileSize: z.coerce.number().int().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required').max(100),
});

// 1. Create Field Service Report Schema
export const createFsrSchema = z.object({
  body: z.object({
    customerId: z.string().uuid('Invalid customer ID'),
    destinationId: z.string().uuid('Invalid destination ID').optional().nullable(),
    productId: z.string().uuid('Invalid product ID').optional().nullable(),
    serviceEngineerId: z.string().uuid('Invalid service engineer ID'),
    visitDate: z.string().min(1, 'Visit date is required'),
    problemReported: z.string().optional().nullable(),
    reasonForVisit: z.string().optional().nullable(),
    callType: z.enum([
      APP_CONSTANTS.FSR_CALL_TYPES.BD,
      APP_CONSTANTS.FSR_CALL_TYPES.PM,
      APP_CONSTANTS.FSR_CALL_TYPES.INSTALLATION,
      APP_CONSTANTS.FSR_CALL_TYPES.COURTESY,
    ]),
    status: z
      .enum([
        APP_CONSTANTS.FSR_STATUSES.DRAFT,
        APP_CONSTANTS.FSR_STATUSES.IN_PROGRESS,
        APP_CONSTANTS.FSR_STATUSES.COMPLETED,
        APP_CONSTANTS.FSR_STATUSES.CLOSED,
        APP_CONSTANTS.FSR_STATUSES.CANCELLED,
      ])
      .optional()
      .default(APP_CONSTANTS.FSR_STATUSES.DRAFT),
    warrantyStatus: z
      .enum([
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.UNDER_WARRANTY,
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.OUT_OF_WARRANTY,
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.AMC,
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.BILLABLE,
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.EXTENDED_WARRANTY,
      ])
      .optional()
      .default(APP_CONSTANTS.FSR_WARRANTY_STATUSES.UNDER_WARRANTY),
    billingStatus: z
      .enum([
        APP_CONSTANTS.FSR_BILLING_STATUSES.BILLABLE,
        APP_CONSTANTS.FSR_BILLING_STATUSES.NON_BILLABLE,
        APP_CONSTANTS.FSR_BILLING_STATUSES.WARRANTY,
        APP_CONSTANTS.FSR_BILLING_STATUSES.AMC,
        APP_CONSTANTS.FSR_BILLING_STATUSES.FREE_SERVICE,
        APP_CONSTANTS.FSR_BILLING_STATUSES.CHARGED,
      ])
      .optional()
      .default(APP_CONSTANTS.FSR_BILLING_STATUSES.FREE_SERVICE),

    // Equipment Details
    productModel: z.string().max(255).optional().nullable(),
    productMake: z.string().max(100).optional().nullable(),
    productSerialNumber: z.string().max(100).optional().nullable(),
    equipmentStatus: z.string().max(50).optional().default('WORKING'),

    // Financials & Standby
    charges: z.coerce.number().min(0, 'Charges cannot be negative').optional().default(0),
    chargesRemarks: z.string().optional().nullable(),
    standbyDetails: z.string().optional().nullable(),

    // Feedback
    fseFeedback: z.string().optional().nullable(),
    customerFeedback: z.string().optional().nullable(),

    // Sign-offs (optional on initial create)
    customerContactName: z.string().max(255).optional().nullable(),
    customerSignature: z.string().optional().nullable(),
    customerStamp: z.string().optional().nullable(),
    customerSignedAt: z.string().optional().nullable(),
    fseName: z.string().max(255).optional().nullable(),
    fseNumber: z.string().max(50).optional().nullable(),
    fseSignature: z.string().optional().nullable(),
    fseSignatureDate: z.string().optional().nullable(),

    // Nested Structured Sections
    siteObservation: siteObservationSchema.optional().nullable(),
    batteryBanks: z.array(batteryBankSchema).optional().default([]),
    parts: z.array(partReplacementSchema).optional().default([]),
  }),
});

// 2. Update Field Service Report Schema
export const updateFsrSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
  }),
  body: z.object({
    destinationId: z.string().uuid('Invalid destination ID').optional().nullable(),
    productId: z.string().uuid('Invalid product ID').optional().nullable(),
    serviceEngineerId: z.string().uuid('Invalid service engineer ID').optional(),
    visitDate: z.string().optional(),
    problemReported: z.string().optional().nullable(),
    reasonForVisit: z.string().optional().nullable(),
    callType: z
      .enum([
        APP_CONSTANTS.FSR_CALL_TYPES.BD,
        APP_CONSTANTS.FSR_CALL_TYPES.PM,
        APP_CONSTANTS.FSR_CALL_TYPES.INSTALLATION,
        APP_CONSTANTS.FSR_CALL_TYPES.COURTESY,
        'PREVENTIVE_MAINTENANCE',
        'BREAKDOWN',
        'SITE_SURVEY',
        'BATTERY_REPLACEMENT',
        'OTHER',
      ])
      .optional(),
    status: z
      .enum([
        APP_CONSTANTS.FSR_STATUSES.DRAFT,
        APP_CONSTANTS.FSR_STATUSES.IN_PROGRESS,
        APP_CONSTANTS.FSR_STATUSES.COMPLETED,
        APP_CONSTANTS.FSR_STATUSES.CLOSED,
        APP_CONSTANTS.FSR_STATUSES.CANCELLED,
      ])
      .optional(),
    warrantyStatus: z
      .enum([
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.UNDER_WARRANTY,
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.OUT_OF_WARRANTY,
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.AMC,
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.BILLABLE,
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.EXTENDED_WARRANTY,
      ])
      .optional(),
    billingStatus: z
      .enum([
        APP_CONSTANTS.FSR_BILLING_STATUSES.BILLABLE,
        APP_CONSTANTS.FSR_BILLING_STATUSES.NON_BILLABLE,
        APP_CONSTANTS.FSR_BILLING_STATUSES.WARRANTY,
        APP_CONSTANTS.FSR_BILLING_STATUSES.AMC,
        APP_CONSTANTS.FSR_BILLING_STATUSES.FREE_SERVICE,
        APP_CONSTANTS.FSR_BILLING_STATUSES.CHARGED,
      ])
      .optional(),

    productModel: z.string().max(255).optional().nullable(),
    productMake: z.string().max(100).optional().nullable(),
    productSerialNumber: z.string().max(100).optional().nullable(),
    equipmentStatus: z.string().max(50).optional(),

    charges: z.coerce.number().min(0).optional(),
    chargesRemarks: z.string().optional().nullable(),
    standbyDetails: z.string().optional().nullable(),

    fseFeedback: z.string().optional().nullable(),
    customerFeedback: z.string().optional().nullable(),

    customerContactName: z.string().max(255).optional().nullable(),
    customerSignature: z.string().optional().nullable(),
    customerStamp: z.string().optional().nullable(),
    customerSignedAt: z.string().optional().nullable(),
    fseName: z.string().max(255).optional().nullable(),
    fseNumber: z.string().max(50).optional().nullable(),
    fseSignature: z.string().optional().nullable(),
    fseSignatureDate: z.string().optional().nullable(),

    siteObservation: siteObservationSchema.optional().nullable(),
    batteryBanks: z.array(batteryBankSchema).optional(),
    parts: z.array(partReplacementSchema).optional(),
  }),
});

// 3. ID Parameter Schema
export const getFsrByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
  }),
});

// 4. Assign FSE Schema
export const assignFseSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
  }),
  body: z.object({
    serviceEngineerId: z.string().uuid('Invalid service engineer ID'),
    remarks: z.string().optional().nullable(),
  }),
});

// 5. Site Observation Mutation Schema
export const updateSiteObservationRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
  }),
  body: siteObservationSchema,
});

// 6. Battery Bank Sub-Resource Schemas
export const addBatteryBankRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
  }),
  body: batteryBankSchema,
});

export const updateBatteryBankRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
    bankId: z.string().uuid('Invalid Battery Bank ID'),
  }),
  body: batteryBankSchema.omit({ readings: true }).partial(),
});

export const deleteBatteryBankRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
    bankId: z.string().uuid('Invalid Battery Bank ID'),
  }),
});

// 7. Battery Reading Sub-Resource Schemas
export const addBatteryReadingRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
    bankId: z.string().uuid('Invalid Battery Bank ID'),
  }),
  body: z.union([
    batteryReadingSchema,
    z.object({
      readings: z.array(batteryReadingSchema).min(1, 'At least one reading is required'),
    }),
  ]),
});

export const updateBatteryReadingRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
    bankId: z.string().uuid('Invalid Battery Bank ID'),
    readingId: z.string().uuid('Invalid Battery Reading ID'),
  }),
  body: batteryReadingSchema.partial(),
});

export const deleteBatteryReadingRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
    bankId: z.string().uuid('Invalid Battery Bank ID'),
    readingId: z.string().uuid('Invalid Battery Reading ID'),
  }),
});

// 8. Parts Replacement Sub-Resource Schemas
export const addPartRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
  }),
  body: partReplacementSchema,
});

export const updatePartRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
    partId: z.string().uuid('Invalid Part ID'),
  }),
  body: partReplacementSchema.partial(),
});

export const deletePartRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
    partId: z.string().uuid('Invalid Part ID'),
  }),
});

// 9. Sign-off Sub-Resource Schemas
export const customerSignOffRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
  }),
  body: customerSignOffSchema,
});

export const fseSignOffRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
  }),
  body: fseSignOffSchema,
});

// 10. Attachment Sub-Resource Schemas
export const uploadAttachmentRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
  }),
  body: attachmentUploadSchema,
});

export const deleteAttachmentRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
    attachmentId: z.string().uuid('Invalid Attachment ID'),
  }),
});

// 11. Status Transition Schemas
export const updateFsrStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
  }),
  body: z.object({
    status: z.enum([
      APP_CONSTANTS.FSR_STATUSES.DRAFT,
      APP_CONSTANTS.FSR_STATUSES.IN_PROGRESS,
      APP_CONSTANTS.FSR_STATUSES.COMPLETED,
      APP_CONSTANTS.FSR_STATUSES.CLOSED,
      APP_CONSTANTS.FSR_STATUSES.CANCELLED,
    ]),
    remarks: z.string().optional(),
  }),
});

export const cancelFsrSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid FSR ID'),
  }),
  body: z.object({
    reason: z.string().min(1, 'Cancellation reason is required'),
  }).optional().default({ reason: 'Cancelled by Administrator' }),
});

// 12. Query / Filter List Schema
export const queryFsrSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().optional(),
    customerId: z.string().uuid().optional(),
    serviceEngineerId: z.string().uuid().optional(),
    assignedEngineerId: z.string().uuid().optional(),
    status: z
      .enum([
        APP_CONSTANTS.FSR_STATUSES.DRAFT,
        APP_CONSTANTS.FSR_STATUSES.IN_PROGRESS,
        APP_CONSTANTS.FSR_STATUSES.COMPLETED,
        APP_CONSTANTS.FSR_STATUSES.CLOSED,
        APP_CONSTANTS.FSR_STATUSES.CANCELLED,
      ])
      .optional(),
    callType: z
      .enum([
        APP_CONSTANTS.FSR_CALL_TYPES.BD,
        APP_CONSTANTS.FSR_CALL_TYPES.PM,
        APP_CONSTANTS.FSR_CALL_TYPES.INSTALLATION,
        APP_CONSTANTS.FSR_CALL_TYPES.COURTESY,
        'PREVENTIVE_MAINTENANCE',
        'BREAKDOWN',
        'SITE_SURVEY',
        'BATTERY_REPLACEMENT',
        'OTHER',
      ])
      .optional(),
    warrantyStatus: z
      .enum([
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.UNDER_WARRANTY,
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.OUT_OF_WARRANTY,
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.AMC,
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.BILLABLE,
        APP_CONSTANTS.FSR_WARRANTY_STATUSES.EXTENDED_WARRANTY,
      ])
      .optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    serialNumber: z.string().optional(),
  }),
});

// Type DTO Exports
export type CreateFsrDto = z.infer<typeof createFsrSchema>['body'];
export type UpdateFsrDto = z.infer<typeof updateFsrSchema>['body'];
export type QueryFsrDto = z.infer<typeof queryFsrSchema>['query'];
export type AssignFseDto = z.infer<typeof assignFseSchema>['body'];
export type SiteObservationDto = z.infer<typeof siteObservationSchema>;
export type BatteryBankDto = z.infer<typeof batteryBankSchema>;
export type BatteryReadingDto = z.infer<typeof batteryReadingSchema>;
export type PartReplacementDto = z.infer<typeof partReplacementSchema>;
export type CustomerSignOffDto = z.infer<typeof customerSignOffSchema>;
export type FseSignOffDto = z.infer<typeof fseSignOffSchema>;
export type AttachmentUploadDto = z.infer<typeof attachmentUploadSchema>;
