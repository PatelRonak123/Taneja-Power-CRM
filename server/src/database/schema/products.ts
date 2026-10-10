import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 100 }).notNull().unique(),
    description: text('description'),
    category: varchar('category', { length: 100 }).notNull(),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    status: varchar('status', { length: 50 }).notNull().default('ACTIVE'), // ACTIVE, INACTIVE, OUT_OF_STOCK

    // Catalogue master metadata
    brand: varchar('brand', { length: 100 }),
    model: varchar('model', { length: 150 }),
    subModel: varchar('sub_model', { length: 100 }),
    series: varchar('series', { length: 100 }),
    warrantyDescription: varchar('warranty_description', { length: 100 }),
    hsnSac: varchar('hsn_sac', { length: 50 }),
    gstRate: numeric('gst_rate', { precision: 5, scale: 2 }),
    unit: varchar('unit', { length: 50 }).notNull().default('NOS'),
    moq: integer('moq'),

    // Public price
    mrp: numeric('mrp', { precision: 12, scale: 2 }),

    // Commercial pricing tiers (internal)
    dealerPrice: numeric('dealer_price', { precision: 12, scale: 2 }),
    partnerPrice: numeric('partner_price', { precision: 12, scale: 2 }),
    dtp: numeric('dtp', { precision: 12, scale: 2 }),
    minPrice: numeric('min_price', { precision: 12, scale: 2 }),
    maxPrice: numeric('max_price', { precision: 12, scale: 2 }),
    priceOnRequest: boolean('price_on_request').notNull().default(false),
    basicPrice: numeric('basic_price', { precision: 12, scale: 2 }),
    gstPaidPrice: numeric('gst_paid_price', { precision: 12, scale: 2 }),
    recommendedPrice: numeric('recommended_price', { precision: 12, scale: 2 }),

    // Technical specifications
    capacityRating: varchar('capacity_rating', { length: 100 }),
    phase: varchar('phase', { length: 50 }),
    technicalSpecifications: text('technical_specifications'),

    // Self-referencing FK for component/split items (e.g. Hitachi external isolation transformers)
    parentProductId: uuid('parent_product_id').references((): AnyPgColumn => products.id, {
      onDelete: 'set null',
    }),

    // Source audit traceability
    sourceSheet: varchar('source_sheet', { length: 100 }),
    sourceRowNumber: integer('source_row_number'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('products_brand_idx').on(table.brand),
    index('products_category_idx').on(table.category),
    index('products_status_idx').on(table.status),
    index('products_model_idx').on(table.model),
    index('products_parent_product_id_idx').on(table.parentProductId),
  ]
);

export type ProductEntity = typeof products.$inferSelect;
export type NewProductEntity = typeof products.$inferInsert;
