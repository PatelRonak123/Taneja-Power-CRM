-- AMC Preventive Maintenance Defect Detection & Repair Follow-up Workflow Migration
-- Extends amc_contract_equipment with condition_status
-- Extends amc_service_requests with commercial coverage fields and quotation/sales order linkage

-- 1. AMC Contract Equipment Condition Tracking
ALTER TABLE "amc_contract_equipment"
  ADD COLUMN IF NOT EXISTS "condition_status" varchar(50) DEFAULT 'OPERATIONAL' NOT NULL;

CREATE INDEX IF NOT EXISTS "amc_contract_equipment_condition_status_idx"
  ON "amc_contract_equipment" ("condition_status");

-- 2. AMC Service Requests Commercial Coverage & Downstream Workflow
ALTER TABLE "amc_service_requests"
  ADD COLUMN IF NOT EXISTS "coverage_type" varchar(50) DEFAULT 'PENDING_REVIEW' NOT NULL;

ALTER TABLE "amc_service_requests"
  ADD COLUMN IF NOT EXISTS "quotation_id" uuid REFERENCES "quotations"("id") ON DELETE set null;

ALTER TABLE "amc_service_requests"
  ADD COLUMN IF NOT EXISTS "sales_order_id" uuid REFERENCES "sales_orders"("id") ON DELETE set null;

ALTER TABLE "amc_service_requests"
  ADD COLUMN IF NOT EXISTS "coverage_decided_at" timestamp with time zone;

ALTER TABLE "amc_service_requests"
  ADD COLUMN IF NOT EXISTS "coverage_decided_by_id" uuid REFERENCES "users"("id") ON DELETE set null;

ALTER TABLE "amc_service_requests"
  ADD COLUMN IF NOT EXISTS "coverage_notes" text;

CREATE INDEX IF NOT EXISTS "amc_service_requests_coverage_type_idx"
  ON "amc_service_requests" ("coverage_type");

CREATE INDEX IF NOT EXISTS "amc_service_requests_quotation_id_idx"
  ON "amc_service_requests" ("quotation_id");

CREATE INDEX IF NOT EXISTS "amc_service_requests_sales_order_id_idx"
  ON "amc_service_requests" ("sales_order_id");
