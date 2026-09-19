-- Phase 7: AMC Renewal, Expiry & Termination Management
-- Adds minimal schema extensions required for renewal chain tracking and
-- improved termination recording. No new tables are created — the existing
-- amc_contracts table already contains all status / date / reason fields.

-- 1. Renewal chain: self-referential nullable FK pointing to the original contract.
ALTER TABLE "amc_contracts"
  ADD COLUMN IF NOT EXISTS "renewed_from_contract_id" uuid;

-- Intentionally NOT adding a formal FK constraint here to allow the column to
-- exist without circular reference complications during migrations. Application
-- layer enforces referential integrity by validating the source contract ID.

-- 2. Termination notice date: records the formal notice date per AMC document
--    (minimum one-month prior notice / 30-day breach remedy window).
ALTER TABLE "amc_contracts"
  ADD COLUMN IF NOT EXISTS "termination_notice_date" timestamp with time zone;

-- 3. Index for renewal chain lookups (find all renewals of a given contract)
CREATE INDEX IF NOT EXISTS "amc_contracts_renewed_from_idx"
  ON "amc_contracts" ("renewed_from_contract_id");
