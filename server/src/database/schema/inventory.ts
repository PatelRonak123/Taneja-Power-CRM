import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { products } from './products.js';
import { users } from './users.js';

/**
 * Stock Movements Table
 * Immutable transaction ledger recording every stock quantity change.
 */
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'restrict' })
      .notNull(),
    movementType: varchar('movement_type', { length: 50 }).notNull(), // IN, OUT, ADJUSTMENT
    quantity: integer('quantity').notNull(), // IN: +qty, OUT: +qty removed, ADJUSTMENT: signed (+/- delta)
    previousQuantity: integer('previous_quantity').notNull(),
    newQuantity: integer('new_quantity').notNull(),
    referenceType: varchar('reference_type', { length: 50 }).notNull(), // AMC, MANUAL_ADJUSTMENT, PURCHASE_RECEIPT, DISPATCH
    referenceId: varchar('reference_id', { length: 255 }),
    reason: text('reason'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('stock_movements_product_id_idx').on(table.productId),
    index('stock_movements_movement_type_idx').on(table.movementType),
    index('stock_movements_reference_type_idx').on(table.referenceType),
    index('stock_movements_reference_id_idx').on(table.referenceId),
    index('stock_movements_created_at_idx').on(table.createdAt),
  ]
);

export type StockMovementEntity = typeof stockMovements.$inferSelect;
export type NewStockMovementEntity = typeof stockMovements.$inferInsert;
