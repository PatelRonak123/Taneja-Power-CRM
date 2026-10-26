import { pgTable, uuid, varchar, text, numeric, integer, timestamp } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  status: varchar('status', { length: 50 }).notNull().default('ACTIVE'), // ACTIVE, INACTIVE, OUT_OF_STOCK
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ProductEntity = typeof products.$inferSelect;
export type NewProductEntity = typeof products.$inferInsert;
