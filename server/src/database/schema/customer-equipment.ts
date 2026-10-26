import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { customers, customerDestinations } from './customers.js';
import { users } from './users.js';
import { products } from './products.js';
import { salesOrders, salesOrderItems } from './sales-orders.js';
import { salesInvoices, salesInvoiceItems } from './invoices.js';
import { dispatches, dispatchItems } from './dispatch.js';
import { quotationItems } from './quotations.js';

/**
 * Customer Equipment / Installed Asset Master Table
 * Represents physical customer-owned equipment instances originating from product dispatch.
 */
export const customerEquipment = pgTable(
  'customer_equipment',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Human-readable sequential asset number: EQ/YYYY-YY/XXXX
    assetNumber: varchar('asset_number', { length: 50 }).notNull().unique(),

    // Customer & Product Foreign Keys
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'restrict' })
      .notNull(),

    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'restrict' })
      .notNull(),

    // Commercial & Delivery Provenance Traceability (null for manual legacy assets)
    salesOrderId: uuid('sales_order_id')
      .references(() => salesOrders.id, { onDelete: 'restrict' }),

    salesOrderItemId: uuid('sales_order_item_id')
      .references(() => salesOrderItems.id, { onDelete: 'restrict' }),

    salesInvoiceId: uuid('sales_invoice_id')
      .references(() => salesInvoices.id, { onDelete: 'set null' }),

    salesInvoiceItemId: uuid('sales_invoice_item_id')
      .references(() => salesInvoiceItems.id, { onDelete: 'set null' }),

    deliveryId: uuid('delivery_id')
      .references(() => dispatches.id, { onDelete: 'restrict' }),

    deliveryItemId: uuid('delivery_item_id')
      .references(() => dispatchItems.id, { onDelete: 'restrict' }),

    // Physical unit identity per Sales Order line
    unitIndex: integer('unit_index').default(1).notNull(),
    serialNumber: varchar('serial_number', { length: 100 }),

    // Historical Product Snapshot
    productName: varchar('product_name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 100 }),
    model: varchar('model', { length: 100 }),
    make: varchar('make', { length: 100 }),
    capacityRating: varchar('capacity_rating', { length: 100 }),
    hsnSac: varchar('hsn_sac', { length: 50 }),

    // Location & Destination
    destinationId: uuid('destination_id')
      .references(() => customerDestinations.id, { onDelete: 'set null' }),
    installationLocation: text('installation_location'),
    installationNotes: text('installation_notes'),
    installationDate: timestamp('installation_date', { withTimezone: true }),

    // Delivery Timestamp
    deliveryDate: timestamp('delivery_date', { withTimezone: true }).notNull(),

    // Warranty Fields
    warrantyStartDate: timestamp('warranty_start_date', { withTimezone: true }),
    warrantyEndDate: timestamp('warranty_end_date', { withTimezone: true }),
    warrantyTermsSnapshot: text('warranty_terms_snapshot'),

    // Condition Status: OPERATIONAL, NEEDS_REPAIR, FAULTY, REPAIRED
    conditionStatus: varchar('condition_status', { length: 50 }).default('OPERATIONAL').notNull(),

    // Asset Status: ACTIVE, INACTIVE
    assetStatus: varchar('asset_status', { length: 50 }).default('ACTIVE').notNull(),

    // Audit Metadata
    createdById: uuid('created_by_id')
      .references(() => users.id, { onDelete: 'set null' }),
    updatedById: uuid('updated_by_id')
      .references(() => users.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('customer_equipment_asset_number_idx').on(table.assetNumber),
    uniqueIndex('customer_equipment_so_unit_unique_idx').on(table.salesOrderItemId, table.unitIndex),
    index('customer_equipment_customer_id_idx').on(table.customerId),
    index('customer_equipment_product_id_idx').on(table.productId),
    index('customer_equipment_sales_order_id_idx').on(table.salesOrderId),
    index('customer_equipment_sales_order_item_id_idx').on(table.salesOrderItemId),
    index('customer_equipment_delivery_id_idx').on(table.deliveryId),
    index('customer_equipment_delivery_item_id_idx').on(table.deliveryItemId),
    index('customer_equipment_condition_status_idx').on(table.conditionStatus),
    index('customer_equipment_asset_status_idx').on(table.assetStatus),
    index('customer_equipment_serial_number_idx').on(table.serialNumber),
  ]
);

/**
 * Customer Equipment Sequences Table
 * Database-backed, transaction-safe fiscal-year numbering for Asset Numbers: EQ/YYYY-YY/XXXX
 */
export const customerEquipmentSequences = pgTable(
  'customer_equipment_sequences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    prefix: varchar('prefix', { length: 20 }).default('EQ').notNull(),
    financialYear: varchar('financial_year', { length: 20 }).notNull(),
    currentSequence: integer('current_sequence').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('customer_equipment_sequences_prefix_fy_unique').on(table.prefix, table.financialYear),
  ]
);

/**
 * Quotation Item Equipment Junction Table
 * Links individual customer equipment assets to AMC quotation lines (handles 1-to-many physical units).
 */
export const quotationItemEquipment = pgTable(
  'quotation_item_equipment',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quotationItemId: uuid('quotation_item_id')
      .references(() => quotationItems.id, { onDelete: 'cascade' })
      .notNull(),
    customerEquipmentId: uuid('customer_equipment_id')
      .references(() => customerEquipment.id, { onDelete: 'restrict' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('quotation_item_equipment_unique_idx').on(table.quotationItemId, table.customerEquipmentId),
    index('quotation_item_equipment_item_id_idx').on(table.quotationItemId),
    index('quotation_item_equipment_equipment_id_idx').on(table.customerEquipmentId),
  ]
);

export type CustomerEquipmentEntity = typeof customerEquipment.$inferSelect;
export type NewCustomerEquipmentEntity = typeof customerEquipment.$inferInsert;

export type CustomerEquipmentSequenceEntity = typeof customerEquipmentSequences.$inferSelect;
export type NewCustomerEquipmentSequenceEntity = typeof customerEquipmentSequences.$inferInsert;

export type QuotationItemEquipmentEntity = typeof quotationItemEquipment.$inferSelect;
export type NewQuotationItemEquipmentEntity = typeof quotationItemEquipment.$inferInsert;
