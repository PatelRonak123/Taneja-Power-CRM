-- Warranty Expiry and AMC Conversion Schema Migration
-- Stage B1: Customer Equipment Warranty Fields, Follow-Up Traceability, Quotation AMC Traceability

-- 1. Extend customer_equipment table with warranty lifecycle & commissioning fields
ALTER TABLE "customer_equipment"
  ADD COLUMN IF NOT EXISTS "warranty_duration_value" integer,
  ADD COLUMN IF NOT EXISTS "warranty_duration_unit" varchar(20),
  ADD COLUMN IF NOT EXISTS "warranty_status" varchar(50) DEFAULT 'PENDING_ACTIVATION' NOT NULL,
  ADD COLUMN IF NOT EXISTS "commissioning_notes" text,
  ADD COLUMN IF NOT EXISTS "commissioned_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "commissioned_at" timestamp with time zone;

-- Check constraints for customer_equipment warranty fields
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customer_equipment_warranty_duration_check'
  ) THEN
    ALTER TABLE "customer_equipment" ADD CONSTRAINT "customer_equipment_warranty_duration_check"
      CHECK (
        ("warranty_duration_value" IS NULL AND "warranty_duration_unit" IS NULL) OR
        ("warranty_duration_value" > 0 AND "warranty_duration_unit" IN ('MONTHS', 'YEARS'))
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customer_equipment_warranty_status_check'
  ) THEN
    ALTER TABLE "customer_equipment" ADD CONSTRAINT "customer_equipment_warranty_status_check"
      CHECK ("warranty_status" IN ('PENDING_ACTIVATION', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'AMC_COVERED'));
  END IF;
END $$;

-- Indexes for customer_equipment warranty queries
CREATE INDEX IF NOT EXISTS "customer_equipment_warranty_end_date_idx" ON "customer_equipment" ("warranty_end_date");
CREATE INDEX IF NOT EXISTS "customer_equipment_warranty_status_idx" ON "customer_equipment" ("warranty_status");
CREATE INDEX IF NOT EXISTS "customer_equipment_installation_date_idx" ON "customer_equipment" ("installation_date");
CREATE INDEX IF NOT EXISTS "customer_equipment_commissioned_by_id_idx" ON "customer_equipment" ("commissioned_by_id");

-- 2. Extend follow_ups table with equipment and warranty cycle traceability
ALTER TABLE "follow_ups"
  ADD COLUMN IF NOT EXISTS "customer_equipment_id" uuid REFERENCES "customer_equipment"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "warranty_cycle" varchar(50),
  ADD COLUMN IF NOT EXISTS "contact_method" varchar(50);

-- Check constraint for follow_ups contact_method
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'follow_ups_contact_method_check'
  ) THEN
    ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_contact_method_check"
      CHECK ("contact_method" IS NULL OR "contact_method" IN ('PHONE', 'EMAIL', 'WHATSAPP', 'IN_PERSON', 'SITE_VISIT'));
  END IF;
END $$;

-- Indexes for follow_ups equipment and deduplicated warranty follow-ups
CREATE INDEX IF NOT EXISTS "follow_ups_customer_equipment_id_idx" ON "follow_ups" ("customer_equipment_id");

CREATE UNIQUE INDEX IF NOT EXISTS "follow_ups_equipment_warranty_cycle_unique_idx"
  ON "follow_ups" ("customer_equipment_id", "warranty_cycle", "type")
  WHERE "customer_equipment_id" IS NOT NULL AND "warranty_cycle" IS NOT NULL;

-- 3. Extend quotations table with source traceability for AMC conversion
ALTER TABLE "quotations"
  ADD COLUMN IF NOT EXISTS "source_equipment_id" uuid REFERENCES "customer_equipment"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "source_follow_up_id" uuid REFERENCES "follow_ups"("id") ON DELETE SET NULL;

-- Indexes for quotations source lookup
CREATE INDEX IF NOT EXISTS "quotations_source_equipment_id_idx" ON "quotations" ("source_equipment_id");
CREATE INDEX IF NOT EXISTS "quotations_source_follow_up_id_idx" ON "quotations" ("source_follow_up_id");
