import { pgTable, uuid, varchar, text, numeric, integer, timestamp, boolean } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  status: varchar('status', { length: 50 }).notNull().default('ACTIVE'), // ACTIVE, INACTIVE, OUT_OF_STOCK
  brand: varchar('brand', { length: 100 }),
  model: varchar('model', { length: 150 }),
  subModel: varchar('sub_model', { length: 150 }),
  series: varchar('series', { length: 150 }),
  warrantyDescription: text('warranty_description'),
  hsnSac: varchar('hsn_sac', { length: 50 }),
  gstRate: numeric('gst_rate', { precision: 5, scale: 2 }),
  unit: varchar('unit', { length: 50 }).default('NOS'),
  moq: integer('moq'),
  mrp: numeric('mrp', { precision: 12, scale: 2 }),
  dealerPrice: numeric('dealer_price', { precision: 12, scale: 2 }),
  partnerPrice: numeric('partner_price', { precision: 12, scale: 2 }),
  dtp: numeric('dtp', { precision: 12, scale: 2 }),
  minPrice: numeric('min_price', { precision: 12, scale: 2 }),
  maxPrice: numeric('max_price', { precision: 12, scale: 2 }),
  priceOnRequest: boolean('price_on_request').default(false),
  basicPrice: numeric('basic_price', { precision: 12, scale: 2 }),
  gstPaidPrice: numeric('gst_paid_price', { precision: 12, scale: 2 }),
  recommendedPrice: numeric('recommended_price', { precision: 12, scale: 2 }),
  capacityRating: varchar('capacity_rating', { length: 100 }),
  phase: varchar('phase', { length: 50 }),
  technicalSpecifications: text('technical_specifications'),
  parentProductId: uuid('parent_product_id'),
  sourceSheet: varchar('source_sheet', { length: 150 }),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ProductEntity = typeof products.$inferSelect;
export type NewProductEntity = typeof products.$inferInsert;

