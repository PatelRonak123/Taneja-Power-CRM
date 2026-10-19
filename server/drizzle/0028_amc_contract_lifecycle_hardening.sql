-- AMC Contract Lifecycle Hardening Migration
-- Stage B4.2: Concurrency-safe unique constraint on initial quotation AMC contract

CREATE UNIQUE INDEX IF NOT EXISTS "amc_contracts_initial_quotation_unique_idx"
  ON "amc_contracts" ("quotation_id")
  WHERE ("renewed_from_contract_id" IS NULL);
