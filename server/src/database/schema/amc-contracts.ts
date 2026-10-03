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
import { quotations, quotationRevisions, quotationItems, quotationAmcScopeItems, quotationAmcExclusions, quotationAmcEscalations } from './quotations.js';
import { salesOrders } from './sales-orders.js';
import { tasks } from './tasks.js';
import { products } from './products.js';

/**
 * AMC Contracts Master Table
 * Operational record created from an accepted AMC quotation snapshot.
 */
export const amcContracts = pgTable(
  'amc_contracts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contractNumber: varchar('contract_number', { length: 100 }).notNull().unique(),
    quotationId: uuid('quotation_id')
      .references(() => quotations.id, { onDelete: 'restrict' })
      .notNull(),
    quotationRevisionId: uuid('quotation_revision_id')
      .references(() => quotationRevisions.id, { onDelete: 'restrict' })
      .notNull(),
    salesOrderId: uuid('sales_order_id')
      .references(() => salesOrders.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'restrict' })
      .notNull(),
    destinationId: uuid('destination_id')
      .references(() => customerDestinations.id, { onDelete: 'set null' }),

    // Snapshot Customer & Location Metadata
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    companyName: varchar('company_name', { length: 255 }),
    endUser: varchar('end_user', { length: 255 }),
    customerCode: varchar('customer_code', { length: 100 }),
    branch: varchar('branch', { length: 100 }),
    zone: varchar('zone', { length: 100 }),

    // Contract Configuration
    amcPlan: varchar('amc_plan', { length: 100 }).notNull(),
    contractStartDate: timestamp('contract_start_date', { withTimezone: true }).notNull(),
    contractEndDate: timestamp('contract_end_date', { withTimezone: true }).notNull(),
    serviceFrequency: varchar('service_frequency', { length: 50 }).notNull(), // Monthly, Bi-Monthly, Quarterly, Half-Yearly, Yearly, Custom
    scheduledVisits: integer('scheduled_visits').default(4).notNull(),
    completedVisits: integer('completed_visits').default(0).notNull(),
    breakdownVisitType: varchar('breakdown_visit_type', { length: 50 }).default('UNLIMITED').notNull(),

    // Contract Lifecycle & Financial Status
    status: varchar('status', { length: 50 }).default('PENDING_ACTIVATION').notNull(), // DRAFT, PENDING_ACTIVATION, ACTIVE, EXPIRING_SOON, EXPIRED, TERMINATED, CANCELLED
    paymentStatus: varchar('payment_status', { length: 50 }).default('PENDING').notNull(), // PENDING, PAID, PARTIALLY_PAID, OVERDUE
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),

    // Terms & Clauses
    specialClauses: text('special_clauses'),
    amcPaymentTerms: text('amc_payment_terms'),
    terminationReason: text('termination_reason'),
    terminationNoticeDate: timestamp('termination_notice_date', { withTimezone: true }),
    terminatedAt: timestamp('terminated_at', { withTimezone: true }),

    // Renewal chain reference
    renewedFromContractId: uuid('renewed_from_contract_id'),

    // Audit Metadata
    createdById: uuid('created_by_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    updatedById: uuid('updated_by_id')
      .references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('amc_contracts_contract_number_idx').on(table.contractNumber),
    index('amc_contracts_customer_id_idx').on(table.customerId),
    index('amc_contracts_destination_id_idx').on(table.destinationId),
    index('amc_contracts_quotation_id_idx').on(table.quotationId),
    index('amc_contracts_quotation_revision_id_idx').on(table.quotationRevisionId),
    index('amc_contracts_sales_order_id_idx').on(table.salesOrderId),
    index('amc_contracts_status_idx').on(table.status),
    index('amc_contracts_payment_status_idx').on(table.paymentStatus),
    index('amc_contracts_start_date_idx').on(table.contractStartDate),
    index('amc_contracts_end_date_idx').on(table.contractEndDate),
    index('amc_contracts_created_at_idx').on(table.createdAt),
    index('amc_contracts_renewed_from_idx').on(table.renewedFromContractId),
  ]
);

/**
 * AMC Contract Equipment Table
 * Snapshot of individual equipment items covered by the contract.
 */
export const amcContractEquipment = pgTable(
  'amc_contract_equipment',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    amcContractId: uuid('amc_contract_id')
      .references(() => amcContracts.id, { onDelete: 'cascade' })
      .notNull(),
    quotationItemId: uuid('quotation_item_id')
      .references(() => quotationItems.id, { onDelete: 'set null' }),
    equipmentType: varchar('equipment_type', { length: 100 }),
    equipmentName: varchar('equipment_name', { length: 255 }).notNull(),
    configuration: varchar('configuration', { length: 100 }),
    rating: varchar('rating', { length: 100 }),
    make: varchar('make', { length: 100 }),
    model: varchar('model', { length: 100 }),
    quantity: numeric('quantity', { precision: 10, scale: 3 }).default('1.000').notNull(),
    unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).default('0.00').notNull(),
    lineTotal: numeric('line_total', { precision: 14, scale: 2 }).default('0.00').notNull(),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
    conditionStatus: varchar('condition_status', { length: 50 }).default('OPERATIONAL').notNull(), // OPERATIONAL, NEEDS_REPAIR, FAULTY, REPAIRED
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('amc_contract_equipment_contract_id_idx').on(table.amcContractId),
    index('amc_contract_equipment_quotation_item_id_idx').on(table.quotationItemId),
    index('amc_contract_equipment_condition_status_idx').on(table.conditionStatus),
  ]
);

/**
 * AMC Contract Scope Items Table
 * Contract-level snapshot of included service scope.
 */
export const amcContractScopeItems = pgTable(
  'amc_contract_scope_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    amcContractId: uuid('amc_contract_id')
      .references(() => amcContracts.id, { onDelete: 'cascade' })
      .notNull(),
    description: text('description').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('amc_contract_scope_items_contract_id_idx').on(table.amcContractId),
    index('amc_contract_scope_items_sort_order_idx').on(table.sortOrder),
  ]
);

/**
 * AMC Contract Exclusions Table
 * Contract-level snapshot of explicit exclusions.
 */
export const amcContractExclusions = pgTable(
  'amc_contract_exclusions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    amcContractId: uuid('amc_contract_id')
      .references(() => amcContracts.id, { onDelete: 'cascade' })
      .notNull(),
    description: text('description').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('amc_contract_exclusions_contract_id_idx').on(table.amcContractId),
    index('amc_contract_exclusions_sort_order_idx').on(table.sortOrder),
  ]
);

/**
 * AMC Contract Escalation Contacts Table
 * Contract-level snapshot of malfunction escalation contact points.
 */
export const amcContractEscalations = pgTable(
  'amc_contract_escalations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    amcContractId: uuid('amc_contract_id')
      .references(() => amcContracts.id, { onDelete: 'cascade' })
      .notNull(),
    level: varchar('level', { length: 20 }).notNull(), // LEVEL_1, LEVEL_2, LEVEL_3
    contactName: varchar('contact_name', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('amc_contract_escalations_contract_id_idx').on(table.amcContractId),
    index('amc_contract_escalations_level_idx').on(table.level),
  ]
);

/**
 * AMC Service Visits Table
 * Scheduled & executed maintenance visits derived from the AMC contract.
 */
export const amcServiceVisits = pgTable(
  'amc_service_visits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    amcContractId: uuid('amc_contract_id')
      .references(() => amcContracts.id, { onDelete: 'cascade' })
      .notNull(),
    visitNumber: integer('visit_number').notNull(),
    scheduledDate: timestamp('scheduled_date', { withTimezone: true }).notNull(),
    serviceType: varchar('service_type', { length: 50 }).default('PREVENTIVE').notNull(), // PREVENTIVE, BREAKDOWN
    status: varchar('status', { length: 50 }).default('SCHEDULED').notNull(), // SCHEDULED, ASSIGNED, IN_PROGRESS, COMPLETED, MISSED, CANCELLED
    assignedEmployeeId: uuid('assigned_employee_id').references(() => users.id, { onDelete: 'set null' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }), // Link to existing tasks module
    
    // Execution Timestamps & Audit Metadata
    actualStartAt: timestamp('actual_start_at', { withTimezone: true }),
    actualEndAt: timestamp('actual_end_at', { withTimezone: true }),
    technicianEmployeeId: uuid('technician_employee_id').references(() => users.id, { onDelete: 'set null' }),
    technicianNotes: text('technician_notes'),
    customerRemarks: text('customer_remarks'),
    visitOutcome: varchar('visit_outcome', { length: 50 }), // SATISFACTORY, REQUIRES_FOLLOWUP, PARTIAL_SERVICE, UNRESOLVED
    completedBy: uuid('completed_by').references(() => users.id, { onDelete: 'set null' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('amc_service_visits_contract_id_idx').on(table.amcContractId),
    index('amc_service_visits_scheduled_date_idx').on(table.scheduledDate),
    index('amc_service_visits_status_idx').on(table.status),
    index('amc_service_visits_assigned_employee_id_idx').on(table.assignedEmployeeId),
    index('amc_service_visits_task_id_idx').on(table.taskId),
  ]
);

/**
 * AMC Service Requests Table
 * Breakdown / emergency maintenance requests logged against an active AMC contract.
 */
export const amcServiceRequests = pgTable(
  'amc_service_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    amcContractId: uuid('amc_contract_id')
      .references(() => amcContracts.id, { onDelete: 'cascade' })
      .notNull(),
    requestNumber: varchar('request_number', { length: 100 }).notNull().unique(),
    serviceType: varchar('service_type', { length: 50 }).default('BREAKDOWN').notNull(),
    equipmentId: uuid('equipment_id').references(() => amcContractEquipment.id, { onDelete: 'set null' }),
    issueDescription: text('issue_description').notNull(),
    priority: varchar('priority', { length: 50 }).default('HIGH').notNull(), // LOW, MEDIUM, HIGH, URGENT
    escalationLevel: varchar('escalation_level', { length: 20 }).default('LEVEL_1').notNull(), // LEVEL_1, LEVEL_2, LEVEL_3
    escalatedAt: timestamp('escalated_at', { withTimezone: true }),
    status: varchar('status', { length: 50 }).default('OPEN').notNull(), // OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CANCELLED
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    assignedEmployeeId: uuid('assigned_employee_id').references(() => users.id, { onDelete: 'set null' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    amcServiceVisitId: uuid('amc_service_visit_id').references(() => amcServiceVisits.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    
    // Commercial Coverage Workflow
    coverageType: varchar('coverage_type', { length: 50 }).default('PENDING_REVIEW').notNull(), // PENDING_REVIEW, AMC_COVERED, CHARGEABLE
    quotationId: uuid('quotation_id').references(() => quotations.id, { onDelete: 'set null' }),
    salesOrderId: uuid('sales_order_id').references(() => salesOrders.id, { onDelete: 'set null' }),
    coverageDecidedAt: timestamp('coverage_decided_at', { withTimezone: true }),
    coverageDecidedById: uuid('coverage_decided_by_id').references(() => users.id, { onDelete: 'set null' }),
    coverageNotes: text('coverage_notes'),

    notes: text('notes'),
    createdById: uuid('created_by_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('amc_service_requests_request_number_idx').on(table.requestNumber),
    index('amc_service_requests_contract_id_idx').on(table.amcContractId),
    index('amc_service_requests_equipment_id_idx').on(table.equipmentId),
    index('amc_service_requests_status_idx').on(table.status),
    index('amc_service_requests_priority_idx').on(table.priority),
    index('amc_service_requests_escalation_level_idx').on(table.escalationLevel),
    index('amc_service_requests_assigned_employee_id_idx').on(table.assignedEmployeeId),
    index('amc_service_requests_task_id_idx').on(table.taskId),
    index('amc_service_requests_visit_id_idx').on(table.amcServiceVisitId),
    index('amc_service_requests_coverage_type_idx').on(table.coverageType),
    index('amc_service_requests_quotation_id_idx').on(table.quotationId),
    index('amc_service_requests_sales_order_id_idx').on(table.salesOrderId),
  ]
);

/**
 * AMC Service Reports Master Table
 * Technical record of service execution and findings for an AMC Service Visit.
 */
export const amcServiceReports = pgTable(
  'amc_service_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    amcContractId: uuid('amc_contract_id')
      .references(() => amcContracts.id, { onDelete: 'cascade' })
      .notNull(),
    amcServiceVisitId: uuid('amc_service_visit_id')
      .references(() => amcServiceVisits.id, { onDelete: 'cascade' })
      .notNull(),
    reportNumber: varchar('report_number', { length: 100 }).notNull().unique(),
    serviceType: varchar('service_type', { length: 50 }).default('PREVENTIVE').notNull(), // PREVENTIVE, BREAKDOWN
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT, COMPLETED
    inspectionDate: timestamp('inspection_date', { withTimezone: true }).defaultNow().notNull(),
    technicianEmployeeId: uuid('technician_employee_id')
      .references(() => users.id, { onDelete: 'set null' }),

    // Detailed Report Content
    serviceSummary: text('service_summary'),
    observations: text('observations'),
    recommendations: text('recommendations'),
    customerName: varchar('customer_name', { length: 255 }),
    customerRemarks: text('customer_remarks'),
    acknowledgementStatus: varchar('acknowledgement_status', { length: 50 }).default('PENDING').notNull(), // PENDING, ACKNOWLEDGED, DECLINED
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    customerSignatureRef: text('customer_signature_ref'),

    createdById: uuid('created_by_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    updatedById: uuid('updated_by_id')
      .references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('amc_service_reports_visit_unique_idx').on(table.amcServiceVisitId),
    uniqueIndex('amc_service_reports_report_number_idx').on(table.reportNumber),
    index('amc_service_reports_contract_id_idx').on(table.amcContractId),
    index('amc_service_reports_status_idx').on(table.status),
    index('amc_service_reports_technician_id_idx').on(table.technicianEmployeeId),
  ]
);

/**
 * AMC Service Report Items (Scope Checklist Results)
 * Evaluation of contract snapshot scope items during visit execution.
 */
export const amcServiceReportItems = pgTable(
  'amc_service_report_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serviceReportId: uuid('service_report_id')
      .references(() => amcServiceReports.id, { onDelete: 'cascade' })
      .notNull(),
    scopeItemId: uuid('scope_item_id')
      .references(() => amcContractScopeItems.id, { onDelete: 'set null' }),
    scopeDescription: text('scope_description').notNull(),
    status: varchar('status', { length: 50 }).default('COMPLETED').notNull(), // COMPLETED, NOT_COMPLETED, NOT_APPLICABLE
    remarks: text('remarks'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('amc_service_report_items_report_id_idx').on(table.serviceReportId),
    index('amc_service_report_items_sort_order_idx').on(table.sortOrder),
  ]
);

/**
 * AMC Service Report Equipment Table
 * Inspection & operational status of covered equipment during visit execution.
 */
export const amcServiceReportEquipment = pgTable(
  'amc_service_report_equipment',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serviceReportId: uuid('service_report_id')
      .references(() => amcServiceReports.id, { onDelete: 'cascade' })
      .notNull(),
    equipmentId: uuid('equipment_id')
      .references(() => amcContractEquipment.id, { onDelete: 'set null' }),
    equipmentName: varchar('equipment_name', { length: 255 }).notNull(),
    configuration: varchar('configuration', { length: 100 }),
    rating: varchar('rating', { length: 100 }),
    conditionStatus: varchar('condition_status', { length: 50 }).default('OPERATIONAL').notNull(), // OPERATIONAL, NEEDS_REPAIR, REPLACED_PART, FAULTY
    observations: text('observations'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('amc_service_report_equipment_report_id_idx').on(table.serviceReportId),
  ]
);

/**
 * AMC Service Report Attachments Table
 * File / photo metadata associated with a service report.
 */
export const amcServiceReportAttachments = pgTable(
  'amc_service_report_attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serviceReportId: uuid('service_report_id')
      .references(() => amcServiceReports.id, { onDelete: 'cascade' })
      .notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    filePath: text('file_path').notNull(),
    fileType: varchar('file_type', { length: 100 }).notNull(),
    fileSize: integer('file_size').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('amc_service_report_attachments_report_id_idx').on(table.serviceReportId),
  ]
);

/**
 * AMC Sequences Table
 * Concurrency-safe atomic sequence tracking for AMC Contracts, Service Requests, and Service Reports.
 */
export const amcSequences = pgTable(
  'amc_sequences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    prefix: varchar('prefix', { length: 50 }).default('AMC').notNull(), // AMC, SR, SRPT
    financialYear: varchar('financial_year', { length: 20 }).notNull(), // e.g. '2026-27'
    currentSequence: integer('current_sequence').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('amc_sequences_prefix_year_unique_idx').on(
      table.prefix,
      table.financialYear
    ),
  ]
);

/**
 * AMC Service Report Materials Table
 * Tracks spare parts, consumables, and materials consumed during AMC service visits.
 * Stock deduction from products.stock_quantity occurs atomically at completion.
 * Idempotency is enforced via stock_consumed_at: once non-null, no re-deduction occurs.
 */
export const amcServiceReportMaterials = pgTable(
  'amc_service_report_materials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serviceReportId: uuid('service_report_id')
      .references(() => amcServiceReports.id, { onDelete: 'cascade' })
      .notNull(),

    // Product Reference
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'restrict' }),

    // Historical snapshots (preserved even if product master changes)
    productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
    skuSnapshot: varchar('sku_snapshot', { length: 100 }),
    unitSnapshot: varchar('unit_snapshot', { length: 50 }).default('PCS').notNull(),

    // Quantity & Classification
    quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
    materialType: varchar('material_type', { length: 50 }).default('SPARE_PART').notNull(),
    // SPARE_PART | CONSUMABLE | MATERIAL | OTHER
    coverageType: varchar('coverage_type', { length: 50 }).default('AMC_INCLUDED').notNull(),
    // AMC_INCLUDED | CHARGEABLE | CUSTOMER_SUPPLIED

    remarks: text('remarks'),

    // Idempotency guard for stock deduction
    // Null = not yet deducted. Set to timestamp when stock is deducted on completion.
    // CUSTOMER_SUPPLIED materials are never deducted; this remains null for them.
    stockConsumedAt: timestamp('stock_consumed_at', { withTimezone: true }),

    sortOrder: integer('sort_order').default(0).notNull(),

    createdById: uuid('created_by_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    updatedById: uuid('updated_by_id')
      .references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('amc_srm_service_report_id_idx').on(table.serviceReportId),
    index('amc_srm_product_id_idx').on(table.productId),
    index('amc_srm_coverage_type_idx').on(table.coverageType),
    index('amc_srm_material_type_idx').on(table.materialType),
    index('amc_srm_sort_order_idx').on(table.sortOrder),
  ]
);

// Type Exports
export type AmcContractEntity = typeof amcContracts.$inferSelect;
export type NewAmcContractEntity = typeof amcContracts.$inferInsert;

export type AmcContractEquipmentEntity = typeof amcContractEquipment.$inferSelect;
export type NewAmcContractEquipmentEntity = typeof amcContractEquipment.$inferInsert;

export type AmcContractScopeItemEntity = typeof amcContractScopeItems.$inferSelect;
export type NewAmcContractScopeItemEntity = typeof amcContractScopeItems.$inferInsert;

export type AmcContractExclusionEntity = typeof amcContractExclusions.$inferSelect;
export type NewAmcContractExclusionEntity = typeof amcContractExclusions.$inferInsert;

export type AmcContractEscalationEntity = typeof amcContractEscalations.$inferSelect;
export type NewAmcContractEscalationEntity = typeof amcContractEscalations.$inferInsert;

export type AmcServiceVisitEntity = typeof amcServiceVisits.$inferSelect;
export type NewAmcServiceVisitEntity = typeof amcServiceVisits.$inferInsert;

export type AmcServiceRequestEntity = typeof amcServiceRequests.$inferSelect;
export type NewAmcServiceRequestEntity = typeof amcServiceRequests.$inferInsert;

export type AmcServiceReportEntity = typeof amcServiceReports.$inferSelect;
export type NewAmcServiceReportEntity = typeof amcServiceReports.$inferInsert;

export type AmcServiceReportItemEntity = typeof amcServiceReportItems.$inferSelect;
export type NewAmcServiceReportItemEntity = typeof amcServiceReportItems.$inferInsert;

export type AmcServiceReportEquipmentEntity = typeof amcServiceReportEquipment.$inferSelect;
export type NewAmcServiceReportEquipmentEntity = typeof amcServiceReportEquipment.$inferInsert;

export type AmcServiceReportAttachmentEntity = typeof amcServiceReportAttachments.$inferSelect;
export type NewAmcServiceReportAttachmentEntity = typeof amcServiceReportAttachments.$inferInsert;

export type AmcSequenceEntity = typeof amcSequences.$inferSelect;
export type NewAmcSequenceEntity = typeof amcSequences.$inferInsert;

export type AmcServiceReportMaterialEntity = typeof amcServiceReportMaterials.$inferSelect;
export type NewAmcServiceReportMaterialEntity = typeof amcServiceReportMaterials.$inferInsert;
