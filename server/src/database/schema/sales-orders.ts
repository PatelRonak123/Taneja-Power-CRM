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
import { quotations, quotationRevisions } from './quotations.js';

/**
 * Sales Orders Master Table
 * Bridges an approved Quotation into a confirmed customer order.
 * PHASE 3: Status transitions DRAFT → PENDING_CONFIRMATION → CONFIRMED | CANCELLED
 * Future statuses (PARTIALLY_INVOICED, FULLY_INVOICED, etc.) are kept in the enum
 * but are NOT exposed or mutated until their respective phases.
 *
 * INVARIANT: No stock mutation ever occurs from any Sales Order operation.
 */
export const salesOrders = pgTable(
  'sales_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Auto-generated company SO number: SO/YYYY-YY/XXXX
    salesOrderNumber: varchar('sales_order_number', { length: 100 }).notNull().unique(),

    // Customer FK – never changes once created
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'restrict' })
      .notNull(),

    // Source quotation – required for Phase 3 (quotation-based creation)
    quotationId: uuid('quotation_id')
      .references(() => quotations.id, { onDelete: 'restrict' })
      .notNull(),

    // Specific revision the SO was created from (preserves snapshot at point of creation)
    quotationRevisionId: uuid('quotation_revision_id')
      .references(() => quotationRevisions.id, { onDelete: 'restrict' })
      .notNull(),

    // Customer's own PO reference – separate from the internal SO number
    customerPoNumber: varchar('customer_po_number', { length: 100 }),
    customerPoDate: timestamp('customer_po_date', { withTimezone: true }),

    // Dates
    orderDate: timestamp('order_date', { withTimezone: true }).defaultNow().notNull(),
    expectedDeliveryDate: timestamp('expected_delivery_date', { withTimezone: true }),

    // Address snapshots – captured at SO creation so master changes don't affect history
    billingAddress: text('billing_address'),
    billingCity: varchar('billing_city', { length: 100 }),
    billingState: varchar('billing_state', { length: 100 }),
    billingPincode: varchar('billing_pincode', { length: 20 }),

    shippingName: varchar('shipping_name', { length: 255 }),
    shippingAddress: text('shipping_address'),
    shippingCity: varchar('shipping_city', { length: 100 }),
    shippingState: varchar('shipping_state', { length: 100 }),
    shippingPincode: varchar('shipping_pincode', { length: 20 }),

    // Commercial terms snapshot
    paymentTerms: text('payment_terms'),
    notes: text('notes'),

    // Financials – always calculated server-side; never trusted from client
    subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxAmount: numeric('tax_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),

    // Lifecycle status
    // Phase 3 active: DRAFT, PENDING_CONFIRMATION, CONFIRMED, CANCELLED
    // Phase 4+ stubs (do not mutate until those phases): PARTIALLY_INVOICED, FULLY_INVOICED
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'),
    dispatchStatus: varchar('dispatch_status', { length: 50 }).notNull().default('NOT_DISPATCHED'),

    // Audit trail
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),

    confirmedBy: uuid('confirmed_by')
      .references(() => users.id, { onDelete: 'set null' }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),

    cancelledBy: uuid('cancelled_by')
      .references(() => users.id, { onDelete: 'set null' }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('sales_orders_so_number_idx').on(table.salesOrderNumber),
    index('sales_orders_customer_id_idx').on(table.customerId),
    index('sales_orders_quotation_id_idx').on(table.quotationId),
    index('sales_orders_status_idx').on(table.status),
    index('sales_orders_order_date_idx').on(table.orderDate),
    index('sales_orders_created_by_idx').on(table.createdBy),
    index('sales_orders_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Sales Order Items Table
 * Product line items snapshotted at SO creation.
 * Historical integrity: changes to the product master do NOT change existing SO items.
 */
export const salesOrderItems = pgTable(
  'sales_order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    salesOrderId: uuid('sales_order_id')
      .references(() => salesOrders.id, { onDelete: 'cascade' })
      .notNull(),

    // FK for reference – nullable to support set null if product deleted (snapshot preserves truth)
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'set null' }),

    // Snapshot fields – immutable historical record
    productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
    skuSnapshot: varchar('sku_snapshot', { length: 100 }),
    descriptionSnapshot: text('description_snapshot'),
    hsnSacSnapshot: varchar('hsn_sac_snapshot', { length: 50 }),
    unitSnapshot: varchar('unit_snapshot', { length: 50 }).default('NOS').notNull(),

    // Quantities and pricing – server-calculated
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
    taxAmount: numeric('tax_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    lineSubtotal: numeric('line_subtotal', { precision: 14, scale: 2 }).notNull().default('0.00'),
    lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull().default('0.00'),

    sortOrder: integer('sort_order').default(0).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('sales_order_items_so_id_idx').on(table.salesOrderId),
    index('sales_order_items_product_id_idx').on(table.productId),
    index('sales_order_items_sort_order_idx').on(table.sortOrder),
  ]
);

/**
 * Sales Order Sequences Table
 * Atomic collision-safe sequential numbering per financial year.
 * Format: SO/YYYY-YY/XXXX
 */
export const salesOrderSequences = pgTable(
  'sales_order_sequences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    prefix: varchar('prefix', { length: 20 }).notNull(),
    financialYear: varchar('financial_year', { length: 20 }).notNull(),
    currentSequence: integer('current_sequence').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('sales_order_sequences_prefix_fy_idx').on(table.prefix, table.financialYear),
  ]
);

// Type exports
export type SalesOrderEntity = typeof salesOrders.$inferSelect;
export type NewSalesOrderEntity = typeof salesOrders.$inferInsert;

export type SalesOrderItemEntity = typeof salesOrderItems.$inferSelect;
export type NewSalesOrderItemEntity = typeof salesOrderItems.$inferInsert;

export type SalesOrderSequenceEntity = typeof salesOrderSequences.$inferSelect;
export type NewSalesOrderSequenceEntity = typeof salesOrderSequences.$inferInsert;
