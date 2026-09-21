import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { customers, customerDestinations } from './customers.js';
import { users } from './users.js';
import { products } from './products.js';

/**
 * Field Service Reports Master Table
 * Represents a complete field service visit / site report for UPS / power equipment.
 */
export const fieldServiceReports = pgTable(
  'field_service_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fsrNumber: varchar('fsr_number', { length: 100 }).notNull().unique(),

    // Core Relations
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'restrict' })
      .notNull(),
    destinationId: uuid('destination_id')
      .references(() => customerDestinations.id, { onDelete: 'set null' }),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'set null' }),
    serviceEngineerId: uuid('service_engineer_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    createdById: uuid('created_by_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    updatedById: uuid('updated_by_id')
      .references(() => users.id, { onDelete: 'set null' }),

    // Visit Details
    visitDate: timestamp('visit_date', { withTimezone: true }).notNull(),
    problemReported: text('problem_reported'),
    reasonForVisit: text('reason_for_visit'),
    callType: varchar('call_type', { length: 50 }).notNull(), // BD, PM, INSTALLATION, COURTESY
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT, IN_PROGRESS, COMPLETED, CLOSED, CANCELLED
    warrantyStatus: varchar('warranty_status', { length: 50 }).default('UNDER_WARRANTY').notNull(), // UNDER_WARRANTY, OUT_OF_WARRANTY, AMC, BILLABLE, EXTENDED_WARRANTY
    billingStatus: varchar('billing_status', { length: 50 }).default('FREE_SERVICE').notNull(), // BILLABLE, NON_BILLABLE, WARRANTY, AMC, FREE_SERVICE, CHARGED

    // Equipment Details / Snapshot
    productModel: varchar('product_model', { length: 255 }),
    productMake: varchar('product_make', { length: 100 }),
    productSerialNumber: varchar('product_serial_number', { length: 100 }),
    equipmentStatus: varchar('equipment_status', { length: 50 }).default('WORKING'), // WORKING, FAULTY, UNDER_MAINTENANCE, DECOMMISSIONED

    // Customer Snapshot (Preserves historical record at visit time)
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    companyName: varchar('company_name', { length: 255 }),
    customerPhone: varchar('customer_phone', { length: 50 }),
    customerEmail: varchar('customer_email', { length: 255 }),
    customerAddress: text('customer_address'),

    // Financials & Standby
    charges: numeric('charges', { precision: 12, scale: 2 }).default('0.00').notNull(),
    chargesRemarks: text('charges_remarks'),
    standbyDetails: text('standby_details'),

    // Feedback
    fseFeedback: text('fse_feedback'),
    customerFeedback: text('customer_feedback'),

    // Customer Sign-off
    customerContactName: varchar('customer_contact_name', { length: 255 }),
    customerSignature: text('customer_signature'),
    customerStamp: text('customer_stamp'),
    customerSignedAt: timestamp('customer_signed_at', { withTimezone: true }),

    // FSE Sign-off
    fseName: varchar('fse_name', { length: 255 }),
    fseNumber: varchar('fse_number', { length: 50 }),
    fseSignature: text('fse_signature'),
    fseSignatureDate: timestamp('fse_signature_date', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('field_service_reports_fsr_number_idx').on(table.fsrNumber),
    index('field_service_reports_customer_id_idx').on(table.customerId),
    index('field_service_reports_destination_id_idx').on(table.destinationId),
    index('field_service_reports_product_id_idx').on(table.productId),
    index('field_service_reports_service_engineer_id_idx').on(table.serviceEngineerId),
    index('field_service_reports_created_by_id_idx').on(table.createdById),
    index('field_service_reports_visit_date_idx').on(table.visitDate),
    index('field_service_reports_status_idx').on(table.status),
    index('field_service_reports_call_type_idx').on(table.callType),
    index('field_service_reports_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Site Observations Table
 * Stores electrical measurements, environmental parameters, and UPS room locations.
 */
export const fieldServiceSiteObservations = pgTable(
  'field_service_site_observations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fsrId: uuid('fsr_id')
      .references(() => fieldServiceReports.id, { onDelete: 'cascade' })
      .notNull(),

    // Electrical Measurements
    inputOnMains: varchar('input_on_mains', { length: 50 }), // e.g., 'OK', 'HIGH', 'LOW', or numeric reading
    inputVoltageLN: numeric('input_voltage_ln', { precision: 8, scale: 2 }),
    inputVoltageLL: numeric('input_voltage_ll', { precision: 8, scale: 2 }),
    outputVoltageLN: numeric('output_voltage_ln', { precision: 8, scale: 2 }),
    outputVoltageLL: numeric('output_voltage_ll', { precision: 8, scale: 2 }),
    vac: numeric('vac', { precision: 8, scale: 2 }),
    frequency: numeric('frequency', { precision: 6, scale: 2 }),
    dcVoltage: numeric('dc_voltage', { precision: 8, scale: 2 }),
    outputLoadPercent: numeric('output_load_percent', { precision: 5, scale: 2 }),
    inputFrequency: numeric('input_frequency', { precision: 6, scale: 2 }),
    outputFrequency: numeric('output_frequency', { precision: 6, scale: 2 }),

    // Environmental Conditions
    environmentCondition: varchar('environment_condition', { length: 20 }), // e.g. 'YES', 'NO', 'FAVORABLE', 'UNFAVORABLE'
    environmentRemarks: text('environment_remarks'),

    // UPS Location
    upsLocation: varchar('ups_location', { length: 50 }), // COMPUTER_ROOM, ELECTRICAL_ROOM, NETWORK_ROOM, OTHER
    otherLocationSpecification: varchar('other_location_specification', { length: 255 }),
    observationsNotes: text('observations_notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('field_service_site_observations_fsr_id_idx').on(table.fsrId),
  ]
);

/**
 * Battery Banks Table
 * Records battery bank configurations, make, ratings, and operating current/voltage.
 */
export const fieldServiceBatteryBanks = pgTable(
  'field_service_battery_banks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fsrId: uuid('fsr_id')
      .references(() => fieldServiceReports.id, { onDelete: 'cascade' })
      .notNull(),
    bankNumber: integer('bank_number').default(1).notNull(),
    bankDescription: varchar('bank_description', { length: 255 }),
    make: varchar('make', { length: 100 }),
    ah: varchar('ah', { length: 50 }),
    quantity: integer('quantity').default(20).notNull(),
    frontIndication: varchar('front_indication', { length: 100 }),
    voltage: numeric('voltage', { precision: 8, scale: 2 }),
    chargingCurrent: numeric('charging_current', { precision: 8, scale: 2 }),
    dischargingCurrent: numeric('discharging_current', { precision: 8, scale: 2 }),
    remarks: text('remarks'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('field_service_battery_banks_fsr_id_idx').on(table.fsrId),
    uniqueIndex('field_service_battery_banks_fsr_bank_unique_idx').on(
      table.fsrId,
      table.bankNumber
    ),
  ]
);

/**
 * Battery Readings Table
 * Cell-by-cell voltage and resistance readings for battery banks.
 */
export const fieldServiceBatteryReadings = pgTable(
  'field_service_battery_readings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fsrId: uuid('fsr_id')
      .references(() => fieldServiceReports.id, { onDelete: 'cascade' })
      .notNull(),
    batteryBankId: uuid('battery_bank_id')
      .references(() => fieldServiceBatteryBanks.id, { onDelete: 'cascade' })
      .notNull(),
    batteryNumber: integer('battery_number').notNull(),
    chargingVoltage: numeric('charging_voltage', { precision: 8, scale: 2 }),
    dischargingVoltage: numeric('discharging_voltage', { precision: 8, scale: 2 }),
    internalResistance: numeric('internal_resistance', { precision: 8, scale: 2 }),
    remarks: varchar('remarks', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('field_service_battery_readings_fsr_id_idx').on(table.fsrId),
    index('field_service_battery_readings_bank_id_idx').on(table.batteryBankId),
    uniqueIndex('field_service_battery_readings_bank_battery_idx').on(
      table.batteryBankId,
      table.batteryNumber
    ),
  ]
);

/**
 * Part Replacement Details Table
 * Records replaced or serviced components during the visit.
 */
export const fieldServiceParts = pgTable(
  'field_service_parts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fsrId: uuid('fsr_id')
      .references(() => fieldServiceReports.id, { onDelete: 'cascade' })
      .notNull(),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'set null' }),
    partName: varchar('part_name', { length: 255 }).notNull(),
    partNumber: varchar('part_number', { length: 100 }),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).default('1.00').notNull(),
    replacementDetails: text('replacement_details'),
    oldPartStatus: varchar('old_part_status', { length: 50 }), // DEFECTIVE, RETURNED, DISPOSED, KEPT_WITH_CLIENT
    remarks: text('remarks'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('field_service_parts_fsr_id_idx').on(table.fsrId),
    index('field_service_parts_product_id_idx').on(table.productId),
  ]
);

/**
 * Field Service Attachments Table
 * Stores metadata and file references for site photos, UPS photos, battery photos, and signed forms.
 */
export const fieldServiceAttachments = pgTable(
  'field_service_attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fsrId: uuid('fsr_id')
      .references(() => fieldServiceReports.id, { onDelete: 'cascade' })
      .notNull(),
    category: varchar('category', { length: 50 }).default('OTHER').notNull(), // UPS_PHOTO, BATTERY_PHOTO, SITE_PHOTO, PART_PHOTO, SIGNED_DOCUMENT, OTHER
    fileName: varchar('file_name', { length: 255 }).notNull(),
    storedFileName: varchar('stored_file_name', { length: 255 }).notNull(),
    filePath: text('file_path').notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    storageProvider: varchar('storage_provider', { length: 50 }).default('LOCAL').notNull(),
    uploadedById: uuid('uploaded_by_id')
      .references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('field_service_attachments_fsr_id_idx').on(table.fsrId),
    index('field_service_attachments_category_idx').on(table.category),
    index('field_service_attachments_uploaded_by_id_idx').on(table.uploadedById),
    index('field_service_attachments_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Field Service Activity Logs Table
 * Comprehensive audit trail and timeline of all lifecycle events on an FSR.
 */
export const fieldServiceActivityLogs = pgTable(
  'field_service_activity_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fsrId: uuid('fsr_id')
      .references(() => fieldServiceReports.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 50 }).notNull(), // CREATED, UPDATED, FSE_ASSIGNED, STARTED, COMPLETED, CLOSED, CANCELLED, CUSTOMER_SIGNED, FSE_SIGNED, PDF_GENERATED
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('field_service_activity_logs_fsr_id_idx').on(table.fsrId),
    index('field_service_activity_logs_user_id_idx').on(table.userId),
    index('field_service_activity_logs_action_idx').on(table.action),
    index('field_service_activity_logs_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Field Service Sequences Table
 * Concurrency-safe sequence tracking for generating consecutive FSR document numbers.
 */
export const fieldServiceSequences = pgTable(
  'field_service_sequences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    prefix: varchar('prefix', { length: 50 }).default('FSR').notNull(),
    financialYear: varchar('financial_year', { length: 20 }).notNull(), // e.g. '2026-27'
    currentSequence: integer('current_sequence').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('field_service_sequences_prefix_year_unique_idx').on(
      table.prefix,
      table.financialYear
    ),
  ]
);

// Type Exports
export type FieldServiceReportEntity = typeof fieldServiceReports.$inferSelect;
export type NewFieldServiceReportEntity = typeof fieldServiceReports.$inferInsert;

export type FieldServiceSiteObservationEntity = typeof fieldServiceSiteObservations.$inferSelect;
export type NewFieldServiceSiteObservationEntity = typeof fieldServiceSiteObservations.$inferInsert;

export type FieldServiceBatteryBankEntity = typeof fieldServiceBatteryBanks.$inferSelect;
export type NewFieldServiceBatteryBankEntity = typeof fieldServiceBatteryBanks.$inferInsert;

export type FieldServiceBatteryReadingEntity = typeof fieldServiceBatteryReadings.$inferSelect;
export type NewFieldServiceBatteryReadingEntity = typeof fieldServiceBatteryReadings.$inferInsert;

export type FieldServicePartEntity = typeof fieldServiceParts.$inferSelect;
export type NewFieldServicePartEntity = typeof fieldServiceParts.$inferInsert;

export type FieldServiceAttachmentEntity = typeof fieldServiceAttachments.$inferSelect;
export type NewFieldServiceAttachmentEntity = typeof fieldServiceAttachments.$inferInsert;

export type FieldServiceActivityLogEntity = typeof fieldServiceActivityLogs.$inferSelect;
export type NewFieldServiceActivityLogEntity = typeof fieldServiceActivityLogs.$inferInsert;

export type FieldServiceSequenceEntity = typeof fieldServiceSequences.$inferSelect;
export type NewFieldServiceSequenceEntity = typeof fieldServiceSequences.$inferInsert;
