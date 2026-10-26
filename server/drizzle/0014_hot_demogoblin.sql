ALTER TABLE "amc_contracts" ADD COLUMN "termination_notice_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "amc_contracts" ADD COLUMN "renewed_from_contract_id" uuid;--> statement-breakpoint
ALTER TABLE "amc_service_requests" ADD COLUMN "equipment_id" uuid;--> statement-breakpoint
ALTER TABLE "amc_service_requests" ADD COLUMN "escalation_level" varchar(20) DEFAULT 'LEVEL_1' NOT NULL;--> statement-breakpoint
ALTER TABLE "amc_service_requests" ADD COLUMN "escalated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "amc_service_requests" ADD COLUMN "amc_service_visit_id" uuid;--> statement-breakpoint
ALTER TABLE "amc_service_requests" ADD CONSTRAINT "amc_service_requests_equipment_id_amc_contract_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."amc_contract_equipment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amc_service_requests" ADD CONSTRAINT "amc_service_requests_amc_service_visit_id_amc_service_visits_id_fk" FOREIGN KEY ("amc_service_visit_id") REFERENCES "public"."amc_service_visits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "amc_contracts_renewed_from_idx" ON "amc_contracts" USING btree ("renewed_from_contract_id");--> statement-breakpoint
CREATE INDEX "amc_service_requests_equipment_id_idx" ON "amc_service_requests" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "amc_service_requests_escalation_level_idx" ON "amc_service_requests" USING btree ("escalation_level");--> statement-breakpoint
CREATE INDEX "amc_service_requests_visit_id_idx" ON "amc_service_requests" USING btree ("amc_service_visit_id");