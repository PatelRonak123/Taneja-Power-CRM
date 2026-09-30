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
import { users } from './users.js';
import { products } from './products.js';

export const suppliers = pgTable(
  'suppliers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    supplierCode: varchar('supplier_code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    legalName: varchar('legal_name', { length: 255 }),
    contactPerson: varchar('contact_person', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    pincode: varchar('pincode', { length: 20 }),
    gstin: varchar('gstin', { length: 50 }),
    pan: varchar('pan', { length: 50 }),
    paymentTerms: text('payment_terms'),
    notes: text('notes'),
    status: varchar('status', { length: 50 }).notNull().default('ACTIVE'), // ACTIVE, INACTIVE
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('suppliers_supplier_code_idx').on(table.supplierCode),
    index('suppliers_name_idx').on(table.name),
    index('suppliers_status_idx').on(table.status),
  ]
);

export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    poNumber: varchar('po_number', { length: 100 }).notNull().unique(),
    supplierId: uuid('supplier_id')
      .references(() => suppliers.id, { onDelete: 'restrict' })
      .notNull(),
    orderDate: timestamp('order_date', { withTimezone: true }).defaultNow().notNull(),
    expectedDeliveryDate: timestamp('expected_delivery_date', { withTimezone: true }),
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'), // DRAFT, PENDING_APPROVAL, APPROVED, PARTIALLY_RECEIVED, FULLY_RECEIVED, CANCELLED
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0.00'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    notes: text('notes'),
    termsAndConditions: text('terms_and_conditions'),
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    approvedBy: uuid('approved_by')
      .references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('purchase_orders_po_number_idx').on(table.poNumber),
    index('purchase_orders_supplier_id_idx').on(table.supplierId),
    index('purchase_orders_status_idx').on(table.status),
    index('purchase_orders_order_date_idx').on(table.orderDate),
    index('purchase_orders_created_by_idx').on(table.createdBy),
  ]
);

export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    purchaseOrderId: uuid('purchase_order_id')
      .references(() => purchaseOrders.id, { onDelete: 'cascade' })
      .notNull(),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'restrict' })
      .notNull(),
    productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
    skuSnapshot: varchar('sku_snapshot', { length: 100 }),
    quantity: integer('quantity').notNull(),
    unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull().default('0.00'),
    receivedQuantity: integer('received_quantity').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('purchase_order_items_po_id_idx').on(table.purchaseOrderId),
    index('purchase_order_items_product_id_idx').on(table.productId),
  ]
);

export const goodsReceipts = pgTable(
  'goods_receipts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    grnNumber: varchar('grn_number', { length: 100 }).notNull().unique(),
    purchaseOrderId: uuid('purchase_order_id')
      .references(() => purchaseOrders.id, { onDelete: 'restrict' })
      .notNull(),
    receiptDate: timestamp('receipt_date', { withTimezone: true }).defaultNow().notNull(),
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'), // DRAFT, POSTED, CANCELLED
    notes: text('notes'),
    receivedBy: uuid('received_by')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('goods_receipts_grn_number_idx').on(table.grnNumber),
    index('goods_receipts_po_id_idx').on(table.purchaseOrderId),
    index('goods_receipts_status_idx').on(table.status),
    index('goods_receipts_receipt_date_idx').on(table.receiptDate),
    index('goods_receipts_received_by_idx').on(table.receivedBy),
  ]
);

export const goodsReceiptItems = pgTable(
  'goods_receipt_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goodsReceiptId: uuid('goods_receipt_id')
      .references(() => goodsReceipts.id, { onDelete: 'cascade' })
      .notNull(),
    purchaseOrderItemId: uuid('purchase_order_item_id')
      .references(() => purchaseOrderItems.id, { onDelete: 'restrict' })
      .notNull(),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'restrict' })
      .notNull(),
    orderedQuantity: integer('ordered_quantity').notNull(),
    previouslyReceivedQuantity: integer('previously_received_quantity').notNull().default(0),
    receivedQuantity: integer('received_quantity').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('goods_receipt_items_grn_id_idx').on(table.goodsReceiptId),
    index('goods_receipt_items_po_item_id_idx').on(table.purchaseOrderItemId),
    index('goods_receipt_items_product_id_idx').on(table.productId),
  ]
);

export const procurementSequences = pgTable(
  'procurement_sequences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    prefix: varchar('prefix', { length: 20 }).notNull(),
    financialYear: varchar('financial_year', { length: 20 }).notNull().default(''),
    currentSequence: integer('current_sequence').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('procurement_sequences_prefix_fy_idx').on(table.prefix, table.financialYear),
  ]
);

export type SupplierEntity = typeof suppliers.$inferSelect;
export type NewSupplierEntity = typeof suppliers.$inferInsert;

export type PurchaseOrderEntity = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrderEntity = typeof purchaseOrders.$inferInsert;

export type PurchaseOrderItemEntity = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItemEntity = typeof purchaseOrderItems.$inferInsert;

export type GoodsReceiptEntity = typeof goodsReceipts.$inferSelect;
export type NewGoodsReceiptEntity = typeof goodsReceipts.$inferInsert;

export type GoodsReceiptItemEntity = typeof goodsReceiptItems.$inferSelect;
export type NewGoodsReceiptItemEntity = typeof goodsReceiptItems.$inferInsert;
