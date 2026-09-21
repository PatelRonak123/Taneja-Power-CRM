-- Phase 8: AMC Breakdown Service & Escalation Management
-- Extends amc_service_requests table with equipmentId, escalationLevel, escalatedAt, and amcServiceVisitId fields.

ALTER TABLE "amc_service_requests"
  ADD COLUMN IF NOT EXISTS "equipment_id" uuid REFERENCES "amc_contract_equipment"("id") ON DELETE set null;

ALTER TABLE "amc_service_requests"
  ADD COLUMN IF NOT EXISTS "escalation_level" varchar(20) DEFAULT 'LEVEL_1' NOT NULL;

ALTER TABLE "amc_service_requests"
  ADD COLUMN IF NOT EXISTS "escalated_at" timestamp with time zone;

ALTER TABLE "amc_service_requests"
  ADD COLUMN IF NOT EXISTS "amc_service_visit_id" uuid REFERENCES "amc_service_visits"("id") ON DELETE set null;

CREATE INDEX IF NOT EXISTS "amc_service_requests_equipment_id_idx"
  ON "amc_service_requests" ("equipment_id");

CREATE INDEX IF NOT EXISTS "amc_service_requests_escalation_level_idx"
  ON "amc_service_requests" ("escalation_level");

CREATE INDEX IF NOT EXISTS "amc_service_requests_visit_id_idx"
  ON "amc_service_requests" ("amc_service_visit_id");
