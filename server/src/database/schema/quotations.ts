import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { customers, customerDestinations } from './customers.js';
import { users } from './users.js';
import { products } from './products.js';

/**
 * Quotations Master Table
 * Represents the top-level quotation entity / deal lifecycle.
 */
export const quotations = pgTable(
  'quotations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quotationNumber: varchar('quotation_number', { length: 100 }).notNull().unique(),
    quotationType: varchar('quotation_type', { length: 50 }).default('PRODUCT').notNull(), // PRODUCT, TECHNICAL, SERVICE, AMC
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(),
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'restrict' })
      .notNull(),
    destinationId: uuid('destination_id')
      .references(() => customerDestinations.id, { onDelete: 'set null' }),
    salespersonId: uuid('salesperson_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    createdById: uuid('created_by_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    updatedById: uuid('updated_by_id')
      .references(() => users.id, { onDelete: 'set null' }),
    currentRevisionNumber: integer('current_revision_number').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('quotations_quotation_number_idx').on(table.quotationNumber),
    index('quotations_customer_id_idx').on(table.customerId),
    index('quotations_destination_id_idx').on(table.destinationId),
    index('quotations_salesperson_id_idx').on(table.salespersonId),
    index('quotations_created_by_id_idx').on(table.createdById),
    index('quotations_status_idx').on(table.status),
    index('quotations_quotation_type_idx').on(table.quotationType),
    index('quotations_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Quotation Revisions Table
 * Versioned snapshot preserving full historical state (customer snapshot, addresses, financial totals, terms).
 */
export const quotationRevisions = pgTable(
  'quotation_revisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quotationId: uuid('quotation_id')
      .references(() => quotations.id, { onDelete: 'cascade' })
      .notNull(),
    revisionNumber: integer('revision_number').default(1).notNull(),
    isCurrent: boolean('is_current').default(true).notNull(),
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(),
    quotationDate: timestamp('quotation_date', { withTimezone: true }).defaultNow().notNull(),
    validityDays: integer('validity_days').default(30).notNull(),
    validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
    currency: varchar('currency', { length: 10 }).default('INR').notNull(),

    // Customer Snapshot
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    companyName: varchar('company_name', { length: 255 }),
    customerEmail: varchar('customer_email', { length: 255 }),
    customerPhone: varchar('customer_phone', { length: 50 }),
    customerGstin: varchar('customer_gstin', { length: 50 }),
    customerPan: varchar('customer_pan', { length: 50 }),

    // Billing Address Snapshot
    billingAddress: text('billing_address'),
    billingCity: varchar('billing_city', { length: 100 }),
    billingState: varchar('billing_state', { length: 100 }),
    billingPincode: varchar('billing_pincode', { length: 20 }),
    billingStateCode: varchar('billing_state_code', { length: 10 }),

    // Shipping Address Snapshot
    shippingName: varchar('shipping_name', { length: 255 }),
    shippingAddress: text('shipping_address'),
    shippingCity: varchar('shipping_city', { length: 100 }),
    shippingState: varchar('shipping_state', { length: 100 }),
    shippingPincode: varchar('shipping_pincode', { length: 20 }),
    shippingStateCode: varchar('shipping_state_code', { length: 10 }),

    // Financial Totals
    subtotal: numeric('subtotal', { precision: 14, scale: 2 }).default('0.00').notNull(),
    totalDiscount: numeric('total_discount', { precision: 14, scale: 2 }).default('0.00').notNull(),
    taxableAmount: numeric('taxable_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
    cgstAmount: numeric('cgst_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
    sgstAmount: numeric('sgst_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
    igstAmount: numeric('igst_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
    totalTax: numeric('total_tax', { precision: 14, scale: 2 }).default('0.00').notNull(),
    freightCharges: numeric('freight_charges', { precision: 14, scale: 2 }).default('0.00').notNull(),
    otherCharges: numeric('other_charges', { precision: 14, scale: 2 }).default('0.00').notNull(),
    roundOff: numeric('round_off', { precision: 10, scale: 2 }).default('0.00').notNull(),
    grandTotal: numeric('grand_total', { precision: 14, scale: 2 }).default('0.00').notNull(),
    amountInWords: text('amount_in_words'),

    // Content & Terms
    subject: varchar('subject', { length: 500 }),
    termsAndConditions: text('terms_and_conditions'),
    paymentTerms: text('payment_terms'),
    deliveryTerms: text('delivery_terms'),
    warrantyTerms: text('warranty_terms'),
    notes: text('notes'),
    internalRemarks: text('internal_remarks'),

    // AMC Contract Snapshot Metadata
    amcPlan: varchar('amc_plan', { length: 100 }),
    amcStartDate: timestamp('amc_start_date', { withTimezone: true }),
    amcEndDate: timestamp('amc_end_date', { withTimezone: true }),
    amcServiceFrequency: varchar('amc_service_frequency', { length: 50 }),
    amcScheduledVisits: integer('amc_scheduled_visits'),
    amcBreakdownVisitType: varchar('amc_breakdown_visit_type', { length: 50 }),
    endUser: varchar('end_user', { length: 255 }),
    customerCode: varchar('customer_code', { length: 100 }),
    branch: varchar('branch', { length: 100 }),
    zone: varchar('zone', { length: 100 }),
    specialClauses: text('special_clauses'),
    amcPaymentTerms: text('amc_payment_terms'),

    // Revision Metadata
    revisionReason: text('revision_reason'),
    createdById: uuid('created_by_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('quotation_revisions_quotation_revision_unique_idx').on(
      table.quotationId,
      table.revisionNumber
    ),
    index('quotation_revisions_quotation_id_idx').on(table.quotationId),
    index('quotation_revisions_status_idx').on(table.status),
    index('quotation_revisions_quotation_date_idx').on(table.quotationDate),
    index('quotation_revisions_valid_until_idx').on(table.validUntil),
    index('quotation_revisions_created_by_id_idx').on(table.createdById),
    index('quotation_revisions_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Quotation Line Items Table
 * Stores individual products, services, or custom deliverables for each revision.
 */
export const quotationItems = pgTable(
  'quotation_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quotationRevisionId: uuid('quotation_revision_id')
      .references(() => quotationRevisions.id, { onDelete: 'cascade' })
      .notNull(),
    quotationId: uuid('quotation_id')
      .references(() => quotations.id, { onDelete: 'cascade' })
      .notNull(),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'set null' }),
    itemType: varchar('item_type', { length: 50 }).default('PRODUCT').notNull(), // PRODUCT, SERVICE, AMC, CUSTOM
    productName: varchar('product_name', { length: 255 }).notNull(),
    productSku: varchar('product_sku', { length: 100 }),
    description: text('description'),
    make: varchar('make', { length: 100 }),
    model: varchar('model', { length: 100 }),
    technicalSpecifications: text('technical_specifications'),
    hsnSac: varchar('hsn_sac', { length: 50 }),
    unit: varchar('unit', { length: 50 }).default('NOS').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).default('1.000').notNull(),
    unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).default('0.00').notNull(),
    discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }).default('0.00').notNull(),
    discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
    taxableAmount: numeric('taxable_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
    gstRate: numeric('gst_rate', { precision: 5, scale: 2 }).default('18.00').notNull(),
    cgstRate: numeric('cgst_rate', { precision: 5, scale: 2 }).default('9.00').notNull(),
    cgstAmount: numeric('cgst_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
    sgstRate: numeric('sgst_rate', { precision: 5, scale: 2 }).default('9.00').notNull(),
    sgstAmount: numeric('sgst_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
    igstRate: numeric('igst_rate', { precision: 5, scale: 2 }).default('0.00').notNull(),
    igstAmount: numeric('igst_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
    totalTax: numeric('total_tax', { precision: 14, scale: 2 }).default('0.00').notNull(),
    lineTotal: numeric('line_total', { precision: 14, scale: 2 }).default('0.00').notNull(),

    // Service / AMC Specific Metadata
    serviceDurationMonths: integer('service_duration_months'),
    serviceVisitsIncluded: integer('service_visits_included'),
    serviceScope: text('service_scope'),

    // AMC Equipment Metadata
    equipmentType: varchar('equipment_type', { length: 100 }),
    equipmentConfiguration: varchar('equipment_configuration', { length: 100 }),
    equipmentRating: varchar('equipment_rating', { length: 100 }),

    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('quotation_items_quotation_revision_id_idx').on(table.quotationRevisionId),
    index('quotation_items_quotation_id_idx').on(table.quotationId),
    index('quotation_items_product_id_idx').on(table.productId),
    index('quotation_items_sort_order_idx').on(table.sortOrder),
  ]
);

/**
 * Quotation AMC Scope Items Table
 * Revision-level scope of work items for AMC contracts.
 */
export const quotationAmcScopeItems = pgTable(
  'quotation_amc_scope_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quotationRevisionId: uuid('quotation_revision_id')
      .references(() => quotationRevisions.id, { onDelete: 'cascade' })
      .notNull(),
    description: text('description').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('quotation_amc_scope_items_revision_id_idx').on(table.quotationRevisionId),
    index('quotation_amc_scope_items_sort_order_idx').on(table.sortOrder),
  ]
);

/**
 * Quotation AMC Exclusions Table
 * Revision-level explicit exclusions for AMC contracts.
 */
export const quotationAmcExclusions = pgTable(
  'quotation_amc_exclusions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quotationRevisionId: uuid('quotation_revision_id')
      .references(() => quotationRevisions.id, { onDelete: 'cascade' })
      .notNull(),
    description: text('description').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('quotation_amc_exclusions_revision_id_idx').on(table.quotationRevisionId),
    index('quotation_amc_exclusions_sort_order_idx').on(table.sortOrder),
  ]
);

/**
 * Quotation AMC Escalation Contacts Table
 * Revision-level malfunction report contact points (Level 1, Level 2, Level 3).
 */
export const quotationAmcEscalations = pgTable(
  'quotation_amc_escalations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quotationRevisionId: uuid('quotation_revision_id')
      .references(() => quotationRevisions.id, { onDelete: 'cascade' })
      .notNull(),
    level: varchar('level', { length: 20 }).notNull(), // LEVEL_1, LEVEL_2, LEVEL_3
    contactName: varchar('contact_name', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('quotation_amc_escalations_revision_id_idx').on(table.quotationRevisionId),
    index('quotation_amc_escalations_level_idx').on(table.level),
  ]
);

/**
 * Quotation Approvals Table
 * Tracks submission and review decisions by Admin / Managers.
 */
export const quotationApprovals = pgTable(
  'quotation_approvals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quotationId: uuid('quotation_id')
      .references(() => quotations.id, { onDelete: 'cascade' })
      .notNull(),
    quotationRevisionId: uuid('quotation_revision_id')
      .references(() => quotationRevisions.id, { onDelete: 'cascade' })
      .notNull(),
    requestedById: uuid('requested_by_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    reviewedById: uuid('reviewed_by_id')
      .references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 50 }).notNull(), // SUBMITTED, APPROVED, REJECTED, WITHDRAWN
    comments: text('comments'),
    actionAt: timestamp('action_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('quotation_approvals_quotation_id_idx').on(table.quotationId),
    index('quotation_approvals_quotation_revision_id_idx').on(table.quotationRevisionId),
    index('quotation_approvals_requested_by_id_idx').on(table.requestedById),
    index('quotation_approvals_reviewed_by_id_idx').on(table.reviewedById),
    index('quotation_approvals_action_at_idx').on(table.actionAt),
  ]
);

/**
 * Quotation Activity Logs Table
 * Comprehensive event timeline for audit tracking and activity history.
 */
export const quotationActivityLogs = pgTable(
  'quotation_activity_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quotationId: uuid('quotation_id')
      .references(() => quotations.id, { onDelete: 'cascade' })
      .notNull(),
    quotationRevisionId: uuid('quotation_revision_id')
      .references(() => quotationRevisions.id, { onDelete: 'set null' }),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 50 }).notNull(), // CREATED, UPDATED, SUBMITTED, WITHDRAWN, APPROVED, REJECTED, REVISED, SENT, FOLLOW_UP, ACCEPTED, CUSTOMER_REJECTED, EXPIRED
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('quotation_activity_logs_quotation_id_idx').on(table.quotationId),
    index('quotation_activity_logs_quotation_revision_id_idx').on(table.quotationRevisionId),
    index('quotation_activity_logs_user_id_idx').on(table.userId),
    index('quotation_activity_logs_action_idx').on(table.action),
    index('quotation_activity_logs_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Quotation Attachments Table
 * Metadata storage for quotation files and specifications.
 */
export const quotationAttachments = pgTable(
  'quotation_attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quotationId: uuid('quotation_id')
      .references(() => quotations.id, { onDelete: 'cascade' })
      .notNull(),
    quotationRevisionId: uuid('quotation_revision_id')
      .references(() => quotationRevisions.id, { onDelete: 'set null' }),
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
    index('quotation_attachments_quotation_id_idx').on(table.quotationId),
    index('quotation_attachments_quotation_revision_id_idx').on(table.quotationRevisionId),
    index('quotation_attachments_uploaded_by_id_idx').on(table.uploadedById),
    index('quotation_attachments_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Quotation Sequences Table
 * Concurrency-safe atomic sequence tracking partitioned by prefix and financial year.
 */
export const quotationSequences = pgTable(
  'quotation_sequences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    prefix: varchar('prefix', { length: 50 }).default('QT').notNull(),
    financialYear: varchar('financial_year', { length: 20 }).notNull(), // e.g. '2026-27'
    currentSequence: integer('current_sequence').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('quotation_sequences_prefix_year_unique_idx').on(
      table.prefix,
      table.financialYear
    ),
  ]
);

// Type Exports
export type QuotationEntity = typeof quotations.$inferSelect;
export type NewQuotationEntity = typeof quotations.$inferInsert;

export type QuotationRevisionEntity = typeof quotationRevisions.$inferSelect;
export type NewQuotationRevisionEntity = typeof quotationRevisions.$inferInsert;

export type QuotationItemEntity = typeof quotationItems.$inferSelect;
export type NewQuotationItemEntity = typeof quotationItems.$inferInsert;

export type QuotationAmcScopeItemEntity = typeof quotationAmcScopeItems.$inferSelect;
export type NewQuotationAmcScopeItemEntity = typeof quotationAmcScopeItems.$inferInsert;

export type QuotationAmcExclusionEntity = typeof quotationAmcExclusions.$inferSelect;
export type NewQuotationAmcExclusionEntity = typeof quotationAmcExclusions.$inferInsert;

export type QuotationAmcEscalationEntity = typeof quotationAmcEscalations.$inferSelect;
export type NewQuotationAmcEscalationEntity = typeof quotationAmcEscalations.$inferInsert;

export type QuotationApprovalEntity = typeof quotationApprovals.$inferSelect;
export type NewQuotationApprovalEntity = typeof quotationApprovals.$inferInsert;

export type QuotationActivityLogEntity = typeof quotationActivityLogs.$inferSelect;
export type NewQuotationActivityLogEntity = typeof quotationActivityLogs.$inferInsert;

export type QuotationAttachmentEntity = typeof quotationAttachments.$inferSelect;
export type NewQuotationAttachmentEntity = typeof quotationAttachments.$inferInsert;

export type QuotationSequenceEntity = typeof quotationSequences.$inferSelect;
export type NewQuotationSequenceEntity = typeof quotationSequences.$inferInsert;
