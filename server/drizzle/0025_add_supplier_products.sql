-- Create supplier_products junction table
CREATE TABLE IF NOT EXISTS "supplier_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "supplier_id" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "supplier_products_supplier_product_idx" ON "supplier_products" ("supplier_id", "product_id");
CREATE INDEX IF NOT EXISTS "supplier_products_supplier_id_idx" ON "supplier_products" ("supplier_id");
CREATE INDEX IF NOT EXISTS "supplier_products_product_id_idx" ON "supplier_products" ("product_id");
