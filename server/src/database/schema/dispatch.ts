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
import { customers } from './customers.js';
import { users } from './users.js';
import { products } from './products.js';
import { salesOrders, salesOrderItems } from './sales-orders.js';
import { salesInvoices, salesInvoiceItems } from './invoices.js';

/**
 * Dispatches Master Table (Delivery Challan)
 * Represents the physical delivery and shipment of goods against confirmed Sales Orders.
 *
 * INVARIANT: Physical stock deduction occurs ONLY on transition to DISPATCHED
 * via central StockService.removeStock().
 */
export const dispatches = pgTable(
  'dispatches',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Authoritative sequential identifier: DC/YYYY-YY/XXXX
    dispatchNumber: varchar('dispatch_number', { length: 50 }).notNull().unique(),
    deliveryChallanNumber: varchar('delivery_challan_number', { length: 50 }).notNull(),

    salesOrderId: uuid('sales_order_id')
      .references(() => salesOrders.id, { onDelete: 'restrict' })
      .notNull(),

    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'restrict' })
      .notNull(),

    salesInvoiceId: uuid('sales_invoice_id')
      .references(() => salesInvoices.id, { onDelete: 'set null' }),

    dispatchDate: timestamp('dispatch_date', { withTimezone: true }).defaultNow().notNull(),

    // Lifecycle: DRAFT -> PENDING_DISPATCH -> DISPATCHED | CANCELLED
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(),

    // Logistics & Transport details
    vehicleNumber: varchar('vehicle_number', { length: 50 }),
    transporterName: varchar('transporter_name', { length: 255 }),
    transporterContact: varchar('transporter_contact', { length: 100 }),
    driverName: varchar('driver_name', { length: 255 }),
    driverPhone: varchar('driver_phone', { length: 50 }),

    // Customer & destination snapshots at time of dispatch
    customerNameSnapshot: varchar('customer_name_snapshot', { length: 255 }),
    customerGstinSnapshot: varchar('customer_gstin_snapshot', { length: 50 }),
    shippingName: varchar('shipping_name', { length: 255 }),
    shippingAddress: text('shipping_address'),
    shippingCity: varchar('shipping_city', { length: 100 }),
    shippingState: varchar('shipping_state', { length: 100 }),
    shippingPincode: varchar('shipping_pincode', { length: 20 }),

    notes: text('notes'),

    // Audit fields
    createdById: uuid('created_by_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),

    dispatchedById: uuid('dispatched_by_id')
      .references(() => users.id, { onDelete: 'set null' }),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),

    cancelledById: uuid('cancelled_by_id')
      .references(() => users.id, { onDelete: 'set null' }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('dispatches_sales_order_id_idx').on(table.salesOrderId),
    index('dispatches_customer_id_idx').on(table.customerId),
    index('dispatches_sales_invoice_id_idx').on(table.salesInvoiceId),
    index('dispatches_status_idx').on(table.status),
    index('dispatches_dispatch_date_idx').on(table.dispatchDate),
  ]
);

/**
 * Dispatch Items Table
 * Snapshots each item physically dispatched.
 * dispatchQuantity is the exact quantity deducted from inventory.
 */
export const dispatchItems = pgTable(
  'dispatch_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    dispatchId: uuid('dispatch_id')
      .references(() => dispatches.id, { onDelete: 'cascade' })
      .notNull(),

    salesOrderItemId: uuid('sales_order_item_id')
      .references(() => salesOrderItems.id, { onDelete: 'restrict' })
      .notNull(),

    salesInvoiceItemId: uuid('sales_invoice_item_id')
      .references(() => salesInvoiceItems.id, { onDelete: 'set null' }),

    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'restrict' })
      .notNull(),

    // Product snapshot
    productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
    skuSnapshot: varchar('sku_snapshot', { length: 100 }),
    descriptionSnapshot: text('description_snapshot'),
    hsnSacSnapshot: varchar('hsn_sac_snapshot', { length: 50 }),
    unitSnapshot: varchar('unit_snapshot', { length: 50 }).default('NOS').notNull(),

    // Quantities
    orderedQuantity: numeric('ordered_quantity', { precision: 12, scale: 3 }).notNull(),
    invoicedQuantity: numeric('invoiced_quantity', { precision: 12, scale: 3 }).default('0').notNull(),
    previouslyDispatchedQuantity: numeric('previously_dispatched_quantity', { precision: 12, scale: 3 }).default('0').notNull(),
    dispatchQuantity: numeric('dispatch_quantity', { precision: 12, scale: 3 }).notNull(),

    sortOrder: integer('sort_order').default(0).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('dispatch_items_dispatch_id_idx').on(table.dispatchId),
    index('dispatch_items_sales_order_item_id_idx').on(table.salesOrderItemId),
    index('dispatch_items_product_id_idx').on(table.productId),
  ]
);

/**
 * Dispatch Sequences Table
 * Database-backed, transaction-safe fiscal-year numbering for Delivery Challans.
 */
export const dispatchSequences = pgTable(
  'dispatch_sequences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    prefix: varchar('prefix', { length: 20 }).default('DC').notNull(),
    financialYear: varchar('financial_year', { length: 20 }).notNull(),
    currentSequence: integer('current_sequence').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('dispatch_sequences_prefix_fy_idx').on(table.prefix, table.financialYear),
  ]
);

/**
 * Dispatch Activity Logs Table
 * Immutable audit trail of every state transition in the dispatch lifecycle.
 */
export const dispatchActivityLogs = pgTable(
  'dispatch_activity_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    dispatchId: uuid('dispatch_id')
      .references(() => dispatches.id, { onDelete: 'cascade' })
      .notNull(),

    action: varchar('action', { length: 50 }).notNull(), // CREATED, SUBMITTED, DISPATCHED, CANCELLED

    actorId: uuid('actor_id')
      .references(() => users.id, { onDelete: 'set null' }),

    notes: text('notes'),
    metadata: text('metadata'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('dispatch_activity_logs_dispatch_id_idx').on(table.dispatchId),
    index('dispatch_activity_logs_created_at_idx').on(table.createdAt),
  ]
);

export type DispatchEntity = typeof dispatches.$inferSelect;
export type NewDispatchEntity = typeof dispatches.$inferInsert;

export type DispatchItemEntity = typeof dispatchItems.$inferSelect;
export type NewDispatchItemEntity = typeof dispatchItems.$inferInsert;

export type DispatchSequenceEntity = typeof dispatchSequences.$inferSelect;
export type NewDispatchSequenceEntity = typeof dispatchSequences.$inferInsert;

export type DispatchActivityLogEntity = typeof dispatchActivityLogs.$inferSelect;
export type NewDispatchActivityLogEntity = typeof dispatchActivityLogs.$inferInsert;
