-- Customer Equipment / Installed Asset Registry Migration
-- 1. Create customer_equipment table
CREATE TABLE IF NOT EXISTS "customer_equipment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "asset_number" varchar(50) NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
  "sales_order_id" uuid NOT NULL REFERENCES "sales_orders"("id") ON DELETE RESTRICT,
  "sales_order_item_id" uuid NOT NULL REFERENCES "sales_order_items"("id") ON DELETE RESTRICT,
  "sales_invoice_id" uuid REFERENCES "sales_invoices"("id") ON DELETE SET NULL,
  "sales_invoice_item_id" uuid REFERENCES "sales_invoice_items"("id") ON DELETE SET NULL,
  "delivery_id" uuid NOT NULL REFERENCES "dispatches"("id") ON DELETE RESTRICT,
  "delivery_item_id" uuid NOT NULL REFERENCES "dispatch_items"("id") ON DELETE RESTRICT,
  "unit_index" integer DEFAULT 1 NOT NULL,
  "serial_number" varchar(100),
  "product_name" varchar(255) NOT NULL,
  "sku" varchar(100),
  "model" varchar(100),
  "make" varchar(100),
  "capacity_rating" varchar(100),
  "hsn_sac" varchar(50),
  "destination_id" uuid REFERENCES "customer_destinations"("id") ON DELETE SET NULL,
  "installation_location" text,
  "installation_notes" text,
  "installation_date" timestamp with time zone,
  "delivery_date" timestamp with time zone NOT NULL,
  "warranty_start_date" timestamp with time zone,
  "warranty_end_date" timestamp with time zone,
  "warranty_terms_snapshot" text,
  "condition_status" varchar(50) DEFAULT 'OPERATIONAL' NOT NULL,
  "asset_status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_equipment_asset_number_idx" ON "customer_equipment" ("asset_number");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_equipment_so_unit_unique_idx" ON "customer_equipment" ("sales_order_item_id", "unit_index");
CREATE INDEX IF NOT EXISTS "customer_equipment_customer_id_idx" ON "customer_equipment" ("customer_id");
CREATE INDEX IF NOT EXISTS "customer_equipment_product_id_idx" ON "customer_equipment" ("product_id");
CREATE INDEX IF NOT EXISTS "customer_equipment_sales_order_id_idx" ON "customer_equipment" ("sales_order_id");
CREATE INDEX IF NOT EXISTS "customer_equipment_sales_order_item_id_idx" ON "customer_equipment" ("sales_order_item_id");
CREATE INDEX IF NOT EXISTS "customer_equipment_delivery_id_idx" ON "customer_equipment" ("delivery_id");
CREATE INDEX IF NOT EXISTS "customer_equipment_delivery_item_id_idx" ON "customer_equipment" ("delivery_item_id");
CREATE INDEX IF NOT EXISTS "customer_equipment_condition_status_idx" ON "customer_equipment" ("condition_status");
CREATE INDEX IF NOT EXISTS "customer_equipment_asset_status_idx" ON "customer_equipment" ("asset_status");
CREATE INDEX IF NOT EXISTS "customer_equipment_serial_number_idx" ON "customer_equipment" ("serial_number");

-- 2. Create customer_equipment_sequences table
CREATE TABLE IF NOT EXISTS "customer_equipment_sequences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "prefix" varchar(20) DEFAULT 'EQ' NOT NULL,
  "financial_year" varchar(20) NOT NULL,
  "current_sequence" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "customer_equipment_sequences_prefix_fy_unique" UNIQUE ("prefix", "financial_year")
);

-- 3. Create quotation_item_equipment junction table
CREATE TABLE IF NOT EXISTS "quotation_item_equipment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "quotation_item_id" uuid NOT NULL REFERENCES "quotation_items"("id") ON DELETE CASCADE,
  "customer_equipment_id" uuid NOT NULL REFERENCES "customer_equipment"("id") ON DELETE RESTRICT,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "quotation_item_equipment_unique_idx" ON "quotation_item_equipment" ("quotation_item_id", "customer_equipment_id");
CREATE INDEX IF NOT EXISTS "quotation_item_equipment_item_id_idx" ON "quotation_item_equipment" ("quotation_item_id");
CREATE INDEX IF NOT EXISTS "quotation_item_equipment_equipment_id_idx" ON "quotation_item_equipment" ("customer_equipment_id");

-- 4. Extend downstream AMC tables
ALTER TABLE "amc_contract_equipment"
  ADD COLUMN IF NOT EXISTS "customer_equipment_id" uuid REFERENCES "customer_equipment"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "amc_contract_equipment_customer_equipment_id_idx" ON "amc_contract_equipment" ("customer_equipment_id");

ALTER TABLE "amc_service_requests"
  ADD COLUMN IF NOT EXISTS "customer_equipment_id" uuid REFERENCES "customer_equipment"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "origin_service_visit_id" uuid REFERENCES "amc_service_visits"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "fsr_id" uuid REFERENCES "field_service_reports"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "amc_service_requests_customer_equipment_id_idx" ON "amc_service_requests" ("customer_equipment_id");
CREATE INDEX IF NOT EXISTS "amc_service_requests_fsr_id_idx" ON "amc_service_requests" ("fsr_id");

ALTER TABLE "amc_service_report_equipment"
  ADD COLUMN IF NOT EXISTS "customer_equipment_id" uuid REFERENCES "customer_equipment"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "amc_service_report_equipment_customer_equipment_id_idx" ON "amc_service_report_equipment" ("customer_equipment_id");

