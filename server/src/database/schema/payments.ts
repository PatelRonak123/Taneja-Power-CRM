import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { customers } from './customers.js';
import { users } from './users.js';
import { salesInvoices } from './invoices.js';
import { amcContracts } from './amc-contracts.js';

/**
 * Customer Payments / Receipts Master Table
 * Tracks payments received against Sales Invoices, AMC Contracts, or direct customer accounts.
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Sequential receipt number: PAY/YYYY-YY/XXXX or REC/YYYY-YY/XXXX
    paymentNumber: varchar('payment_number', { length: 100 }).notNull().unique(),

    // Customer reference – required
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'restrict' })
      .notNull(),

    // Linked Sales Invoice (optional – if payment is against a sales invoice)
    salesInvoiceId: uuid('sales_invoice_id')
      .references(() => salesInvoices.id, { onDelete: 'set null' }),

    // Linked Pro Forma Invoice (optional – if advance payment is against a proforma invoice)
    proformaInvoiceId: uuid('proforma_invoice_id'),

    // Linked Sales Order (optional – if advance payment is against a sales order)
    salesOrderId: uuid('sales_order_id'),

    // Linked AMC Contract (optional – if payment is against an AMC contract)
    amcContractId: uuid('amc_contract_id')
      .references(() => amcContracts.id, { onDelete: 'set null' }),

    // Payment Amount
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),

    // Payment Date
    paymentDate: timestamp('payment_date', { withTimezone: true }).defaultNow().notNull(),

    // Payment Mode: BANK_TRANSFER, NEFT_RTGS, UPI, CHEQUE, CASH, OTHER
    paymentMode: varchar('payment_mode', { length: 50 }).notNull().default('BANK_TRANSFER'),

    // Reference / UTR / Cheque / Transaction Number
    referenceNumber: varchar('reference_number', { length: 100 }),

    // Internal Notes or Remarks
    notes: text('notes'),

    // Audit
    recordedBy: uuid('recorded_by')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('payments_payment_number_idx').on(table.paymentNumber),
    index('payments_customer_id_idx').on(table.customerId),
    index('payments_sales_invoice_id_idx').on(table.salesInvoiceId),
    index('payments_proforma_invoice_id_idx').on(table.proformaInvoiceId),
    index('payments_sales_order_id_idx').on(table.salesOrderId),
    index('payments_amc_contract_id_idx').on(table.amcContractId),
    index('payments_payment_date_idx').on(table.paymentDate),
    index('payments_recorded_by_idx').on(table.recordedBy),
  ]
);

export type PaymentEntity = typeof payments.$inferSelect;
export type NewPaymentEntity = typeof payments.$inferInsert;
