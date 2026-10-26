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
import { salesInvoices } from './invoices.js';

// ─── 1. Pro Forma Invoices Master Table ──────────────────────────────────────

/**
 * Pro Forma Invoices Master Table
 * Generated from a CONFIRMED or PARTIALLY_INVOICED Sales Order.
 * Snapshots customer information, commercial terms, and financial totals for preliminary payment reference.
 *
 * INVARIANT: Pro Forma Invoice creation, submission, or issuance NEVER touches products.stockQuantity,
 * NEVER mutates warehouse stock, and NEVER automatically generates a Tax Invoice.
 */
export const proformaInvoices = pgTable(
  'proforma_invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Sequential document number: PI/YYYY-YY/XXXX
    proformaInvoiceNumber: varchar('proforma_invoice_number', { length: 100 }).notNull().unique(),

    // Source Sales Order – required (cannot bypass SO confirmation gate)
    salesOrderId: uuid('sales_order_id')
      .references(() => salesOrders.id, { onDelete: 'restrict' })
      .notNull(),

    // Customer reference
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'restrict' })
      .notNull(),

    // Dates
    proformaInvoiceDate: timestamp('proforma_invoice_date', { withTimezone: true }).defaultNow().notNull(),
    validityDate: timestamp('validity_date', { withTimezone: true }),

    // Status: DRAFT, ISSUED, PARTIALLY_PAID, PAID, CANCELLED
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

    // Commercial Terms & Payment Instructions
    paymentTerms: text('payment_terms'),
    deliveryTerms: text('delivery_terms'),
    expectedDeliveryTimeline: varchar('expected_delivery_timeline', { length: 100 }),
    bankDetails: text('bank_details'),
    notes: text('notes'),

    // Financial Totals (numeric – calculated server-side)
    subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull().default('0.00'),
    discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxableAmount: numeric('taxable_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    cgstAmount: numeric('cgst_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    sgstAmount: numeric('sgst_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    igstAmount: numeric('igst_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    totalTax: numeric('total_tax', { precision: 14, scale: 2 }).notNull().default('0.00'),
    roundOff: numeric('round_off', { precision: 10, scale: 2 }).notNull().default('0.00'),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),

    // Advance payment tracking
    advanceAmountRequested: numeric('advance_amount_requested', { precision: 14, scale: 2 }).notNull().default('0.00'),
    paidAmount: numeric('paid_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),

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

    revisionNumber: integer('revision_number').notNull().default(1),
    relatedTaxInvoiceId: uuid('related_tax_invoice_id')
      .references(() => salesInvoices.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('proforma_invoices_number_idx').on(table.proformaInvoiceNumber),
    index('proforma_invoices_sales_order_id_idx').on(table.salesOrderId),
    index('proforma_invoices_customer_id_idx').on(table.customerId),
    index('proforma_invoices_status_idx').on(table.status),
    index('proforma_invoices_pi_date_idx').on(table.proformaInvoiceDate),
    index('proforma_invoices_created_by_idx').on(table.createdBy),
  ]
);

// ─── 2. Pro Forma Invoice Line Items ─────────────────────────────────────────

/**
 * Pro Forma Invoice Line Items Table
 * Snapshotted from Sales Order line items.
 */
export const proformaInvoiceItems = pgTable(
  'proforma_invoice_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    proformaInvoiceId: uuid('proforma_invoice_id')
      .references(() => proformaInvoices.id, { onDelete: 'cascade' })
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
    index('proforma_invoice_items_pi_id_idx').on(table.proformaInvoiceId),
    index('proforma_invoice_items_so_item_id_idx').on(table.salesOrderItemId),
    index('proforma_invoice_items_product_id_idx').on(table.productId),
  ]
);

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type ProformaInvoiceEntity = typeof proformaInvoices.$inferSelect;
export type NewProformaInvoiceEntity = typeof proformaInvoices.$inferInsert;

export type ProformaInvoiceItemEntity = typeof proformaInvoiceItems.$inferSelect;
export type NewProformaInvoiceItemEntity = typeof proformaInvoiceItems.$inferInsert;
