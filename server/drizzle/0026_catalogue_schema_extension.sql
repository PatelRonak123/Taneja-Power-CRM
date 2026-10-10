-- Catalogue Schema Extension Migration
-- Additive columns for catalogue master metadata, specifications, and commercial pricing tiers

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "brand" varchar(100),
  ADD COLUMN IF NOT EXISTS "model" varchar(150),
  ADD COLUMN IF NOT EXISTS "sub_model" varchar(100),
  ADD COLUMN IF NOT EXISTS "series" varchar(100),
  ADD COLUMN IF NOT EXISTS "warranty_description" varchar(100),
  ADD COLUMN IF NOT EXISTS "hsn_sac" varchar(50),
  ADD COLUMN IF NOT EXISTS "gst_rate" numeric(5, 2),
  ADD COLUMN IF NOT EXISTS "unit" varchar(50) DEFAULT 'NOS' NOT NULL,
  ADD COLUMN IF NOT EXISTS "moq" integer,
  ADD COLUMN IF NOT EXISTS "mrp" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "dealer_price" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "partner_price" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "dtp" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "min_price" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "max_price" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "price_on_request" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "basic_price" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "gst_paid_price" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "recommended_price" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "capacity_rating" varchar(100),
  ADD COLUMN IF NOT EXISTS "phase" varchar(50),
  ADD COLUMN IF NOT EXISTS "technical_specifications" text,
  ADD COLUMN IF NOT EXISTS "parent_product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "source_sheet" varchar(100),
  ADD COLUMN IF NOT EXISTS "source_row_number" integer;

-- Indexes for performance and foreign-key lookups
CREATE INDEX IF NOT EXISTS "products_brand_idx" ON "products" ("brand");
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products" ("category");
CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products" ("status");
CREATE INDEX IF NOT EXISTS "products_model_idx" ON "products" ("model");
CREATE INDEX IF NOT EXISTS "products_parent_product_id_idx" ON "products" ("parent_product_id");
