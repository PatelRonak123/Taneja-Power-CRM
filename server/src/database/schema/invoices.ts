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
import { suppliers, purchaseOrders, purchaseOrderItems, goodsReceipts, goodsReceiptItems } from './procurement.js';

// ─── 1. Sales Invoices ────────────────────────────────────────────────────────

/**
 * Sales Invoices Master Table
 * Generated from a CONFIRMED Sales Order.
 * Snapshots customer information, billing/shipping addresses, and financial totals.
 *
 * INVARIANT: Sales Invoice creation, submission, or issuance NEVER touches products.stockQuantity
 * and NEVER creates stock_movements records. Stock OUT is deferred to Phase 5 Dispatch.
 */
export const salesInvoices = pgTable(
  'sales_invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Auto-generated company invoice number: INV/YYYY-YY/XXXX
    invoiceNumber: varchar('invoice_number', { length: 100 }).notNull().unique(),

    // Source Sales Order – required
    salesOrderId: uuid('sales_order_id')
      .references(() => salesOrders.id, { onDelete: 'restrict' })
      .notNull(),

    // Customer reference
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'restrict' })
      .notNull(),

    // Dates
    invoiceDate: timestamp('invoice_date', { withTimezone: true }).defaultNow().notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }),

    // Status: DRAFT, PENDING_ISSUE, ISSUED, PARTIALLY_PAID, PAID, CANCELLED
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'),

    currency: varchar('currency', { length: 10 }).notNull().default('INR'),

    // Customer & Address Snapshots (immutable historical record)
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    legalName: varchar('legal_name', { length: 255 }),
    gstin: varchar('gstin', { length: 50 }),
    pan: varchar('pan', { length: 50 }),
    customerEmail: varchar('customer_email', { length: 255 }),
    customerPhone: varchar('customer_phone', { length: 50 }),

    billingAddress: text('billing_address'),
    billingCity: varchar('billing_city', { length: 100 }),
    billingState: varchar('billing_state', { length: 100 }),
    billingPincode: varchar('billing_pincode', { length: 20 }),
    billingStateCode: varchar('billing_state_code', { length: 10 }),

    shippingName: varchar('shipping_name', { length: 255 }),
    shippingAddress: text('shipping_address'),
    shippingCity: varchar('shipping_city', { length: 100 }),
    shippingState: varchar('shipping_state', { length: 100 }),
    shippingPincode: varchar('shipping_pincode', { length: 20 }),
    shippingStateCode: varchar('shipping_state_code', { length: 10 }),

    // Commercial Terms & Notes
    paymentTerms: text('payment_terms'),
    notes: text('notes'),

    // Financial Totals (DECIMAL/numeric – calculated server-side, never trusted from client)
    subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull().default('0.00'),
    discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxableAmount: numeric('taxable_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    cgstAmount: numeric('cgst_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    sgstAmount: numeric('sgst_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    igstAmount: numeric('igst_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    totalTax: numeric('total_tax', { precision: 14, scale: 2 }).notNull().default('0.00'),
    roundOff: numeric('round_off', { precision: 10, scale: 2 }).notNull().default('0.00'),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),

    // Audit Fields
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    issuedBy: uuid('issued_by')
      .references(() => users.id, { onDelete: 'set null' }),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    cancelledBy: uuid('cancelled_by')
      .references(() => users.id, { onDelete: 'set null' }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('sales_invoices_invoice_number_idx').on(table.invoiceNumber),
    index('sales_invoices_sales_order_id_idx').on(table.salesOrderId),
    index('sales_invoices_customer_id_idx').on(table.customerId),
    index('sales_invoices_status_idx').on(table.status),
    index('sales_invoices_invoice_date_idx').on(table.invoiceDate),
    index('sales_invoices_created_by_idx').on(table.createdBy),
  ]
);

// ─── 2. Sales Invoice Line Items ──────────────────────────────────────────────

/**
 * Sales Invoice Line Items Table
 * Snapshotted from Sales Order line items.
 * Immutable snapshot preserves historical invoice integrity.
 */
export const salesInvoiceItems = pgTable(
  'sales_invoice_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    salesInvoiceId: uuid('sales_invoice_id')
      .references(() => salesInvoices.id, { onDelete: 'cascade' })
      .notNull(),
    salesOrderItemId: uuid('sales_order_item_id')
      .references(() => salesOrderItems.id, { onDelete: 'restrict' })
      .notNull(),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'set null' }),

    // Snapshot Fields
    productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
    skuSnapshot: varchar('sku_snapshot', { length: 100 }),
    descriptionSnapshot: text('description_snapshot'),
    hsnSacSnapshot: varchar('hsn_sac_snapshot', { length: 50 }),
    unitSnapshot: varchar('unit_snapshot', { length: 50 }).notNull().default('NOS'),

    // Quantities & Pricing
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxableAmount: numeric('taxable_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),

    // Tax Details
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('18.00'),
    cgstRate: numeric('cgst_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
    sgstRate: numeric('sgst_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
    igstRate: numeric('igst_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
    cgstAmount: numeric('cgst_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    sgstAmount: numeric('sgst_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    igstAmount: numeric('igst_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxAmount: numeric('tax_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull().default('0.00'),

    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('sales_invoice_items_invoice_id_idx').on(table.salesInvoiceId),
    index('sales_invoice_items_so_item_id_idx').on(table.salesOrderItemId),
    index('sales_invoice_items_product_id_idx').on(table.productId),
  ]
);

// ─── 3. Invoice Sequences Table ───────────────────────────────────────────────

/**
 * Sequential Number Generator for Invoices.
 * Uses atomic ON CONFLICT DO UPDATE per prefix and financial year.
 * Format: INV/YYYY-YY/XXXX
 */
export const invoiceSequences = pgTable(
  'invoice_sequences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    prefix: varchar('prefix', { length: 20 }).notNull(),
    financialYear: varchar('financial_year', { length: 20 }).notNull(),
    currentSequence: integer('current_sequence').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('invoice_sequences_prefix_fy_idx').on(table.prefix, table.financialYear),
  ]
);

// ─── 4. Vendor Invoices ───────────────────────────────────────────────────────

/**
 * Vendor Invoices (Supplier Bills)
 * Represents an external bill received from a supplier against a Purchase Order and/or Goods Receipt (GRN).
 * Uniqueness: (supplierId, vendorInvoiceNumber)
 *
 * INVARIANT: Vendor Invoice creation, verification, or posting NEVER touches products.stockQuantity
 * and NEVER writes stock_movements records. Stock IN was already performed during Phase 2 GRN posting.
 */
export const vendorInvoices = pgTable(
  'vendor_invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Supplier's original bill number – preserved exactly
    vendorInvoiceNumber: varchar('vendor_invoice_number', { length: 100 }).notNull(),

    supplierId: uuid('supplier_id')
      .references(() => suppliers.id, { onDelete: 'restrict' })
      .notNull(),

    purchaseOrderId: uuid('purchase_order_id')
      .references(() => purchaseOrders.id, { onDelete: 'restrict' })
      .notNull(),

    goodsReceiptId: uuid('goods_receipt_id')
      .references(() => goodsReceipts.id, { onDelete: 'set null' }),

    invoiceDate: timestamp('invoice_date', { withTimezone: true }).defaultNow().notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }),

    // Status: DRAFT, PENDING_VERIFICATION, VERIFIED, POSTED, REJECTED, CANCELLED
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'),

    currency: varchar('currency', { length: 10 }).notNull().default('INR'),

    // Financial Totals – server authoritative
    subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxAmount: numeric('tax_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),

    notes: text('notes'),

    // Audit
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    verifiedBy: uuid('verified_by')
      .references(() => users.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    postedBy: uuid('posted_by')
      .references(() => users.id, { onDelete: 'set null' }),
    postedAt: timestamp('posted_at', { withTimezone: true }),
    cancelledBy: uuid('cancelled_by')
      .references(() => users.id, { onDelete: 'set null' }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('vendor_invoices_supplier_invoice_num_idx').on(table.supplierId, table.vendorInvoiceNumber),
    index('vendor_invoices_supplier_id_idx').on(table.supplierId),
    index('vendor_invoices_po_id_idx').on(table.purchaseOrderId),
    index('vendor_invoices_grn_id_idx').on(table.goodsReceiptId),
    index('vendor_invoices_status_idx').on(table.status),
    index('vendor_invoices_invoice_date_idx').on(table.invoiceDate),
  ]
);

// ─── 5. Vendor Invoice Line Items ─────────────────────────────────────────────

/**
 * Vendor Invoice Line Items
 * Enables future three-way matching: PO quantity ↔ GRN received quantity ↔ Invoiced quantity.
 * Rule: invoicedQuantity <= receivedQuantity.
 */
export const vendorInvoiceItems = pgTable(
  'vendor_invoice_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    vendorInvoiceId: uuid('vendor_invoice_id')
      .references(() => vendorInvoices.id, { onDelete: 'cascade' })
      .notNull(),
    purchaseOrderItemId: uuid('purchase_order_item_id')
      .references(() => purchaseOrderItems.id, { onDelete: 'restrict' })
      .notNull(),
    goodsReceiptItemId: uuid('goods_receipt_item_id')
      .references(() => goodsReceiptItems.id, { onDelete: 'set null' }),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'restrict' })
      .notNull(),

    // Snapshots
    skuSnapshot: varchar('sku_snapshot', { length: 100 }),
    productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
    descriptionSnapshot: text('description_snapshot'),

    // Quantities
    orderedQuantity: integer('ordered_quantity').notNull(),
    receivedQuantity: integer('received_quantity').notNull(),
    invoicedQuantity: integer('invoiced_quantity').notNull(),

    // Pricing & Tax
    unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull().default('0.00'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('vendor_invoice_items_invoice_id_idx').on(table.vendorInvoiceId),
    index('vendor_invoice_items_po_item_id_idx').on(table.purchaseOrderItemId),
    index('vendor_invoice_items_grn_item_id_idx').on(table.goodsReceiptItemId),
    index('vendor_invoice_items_product_id_idx').on(table.productId),
  ]
);

// ─── 6. Invoice Activity Logs ─────────────────────────────────────────────────

/**
 * Universal Invoice Activity & Audit Trail
 */
export const invoiceActivityLogs = pgTable(
  'invoice_activity_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceType: varchar('invoice_type', { length: 50 }).notNull(), // 'SALES_INVOICE' | 'VENDOR_INVOICE'
    invoiceId: uuid('invoice_id').notNull(),
    action: varchar('action', { length: 50 }).notNull(), // CREATED, SUBMITTED, ISSUED, VERIFIED, POSTED, REJECTED, CANCELLED
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    details: text('details'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('invoice_activity_logs_invoice_id_idx').on(table.invoiceId),
    index('invoice_activity_logs_user_id_idx').on(table.userId),
    index('invoice_activity_logs_action_idx').on(table.action),
    index('invoice_activity_logs_created_at_idx').on(table.createdAt),
  ]
);

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type SalesInvoiceEntity = typeof salesInvoices.$inferSelect;
export type NewSalesInvoiceEntity = typeof salesInvoices.$inferInsert;

export type SalesInvoiceItemEntity = typeof salesInvoiceItems.$inferSelect;
export type NewSalesInvoiceItemEntity = typeof salesInvoiceItems.$inferInsert;

export type InvoiceSequenceEntity = typeof invoiceSequences.$inferSelect;
export type NewInvoiceSequenceEntity = typeof invoiceSequences.$inferInsert;

export type VendorInvoiceEntity = typeof vendorInvoices.$inferSelect;
export type NewVendorInvoiceEntity = typeof vendorInvoices.$inferInsert;

export type VendorInvoiceItemEntity = typeof vendorInvoiceItems.$inferSelect;
export type NewVendorInvoiceItemEntity = typeof vendorInvoiceItems.$inferInsert;

export type InvoiceActivityLogEntity = typeof invoiceActivityLogs.$inferSelect;
export type NewInvoiceActivityLogEntity = typeof invoiceActivityLogs.$inferInsert;
