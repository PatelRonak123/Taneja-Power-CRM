-- Phase 6: AMC Spare Parts, Material Consumption & Inventory Integration
-- Creates the amc_service_report_materials table for tracking spare parts
-- and consumables used during AMC service visits.
--
-- Stock deduction occurs atomically on service report completion using the
-- existing products.stock_quantity column as the inventory source of truth.
-- Idempotency is enforced via stock_consumed_at (null = not yet deducted).

CREATE TABLE IF NOT EXISTS "amc_service_report_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_report_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name_snapshot" varchar(255) NOT NULL,
	"sku_snapshot" varchar(100),
	"unit_snapshot" varchar(50) DEFAULT 'PCS' NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"material_type" varchar(50) DEFAULT 'SPARE_PART' NOT NULL,
	"coverage_type" varchar(50) DEFAULT 'AMC_INCLUDED' NOT NULL,
	"remarks" text,
	"stock_consumed_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by_id" uuid NOT NULL,
	"updated_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "amc_srm_quantity_positive" CHECK ("quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "amc_service_report_materials"
	ADD CONSTRAINT "amc_srm_service_report_id_fk"
	FOREIGN KEY ("service_report_id")
	REFERENCES "public"."amc_service_reports"("id")
	ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "amc_service_report_materials"
	ADD CONSTRAINT "amc_srm_product_id_fk"
	FOREIGN KEY ("product_id")
	REFERENCES "public"."products"("id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "amc_service_report_materials"
	ADD CONSTRAINT "amc_srm_created_by_id_fk"
	FOREIGN KEY ("created_by_id")
	REFERENCES "public"."users"("id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "amc_service_report_materials"
	ADD CONSTRAINT "amc_srm_updated_by_id_fk"
	FOREIGN KEY ("updated_by_id")
	REFERENCES "public"."users"("id")
	ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "amc_srm_service_report_id_idx" ON "amc_service_report_materials" USING btree ("service_report_id");
--> statement-breakpoint
CREATE INDEX "amc_srm_product_id_idx" ON "amc_service_report_materials" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX "amc_srm_coverage_type_idx" ON "amc_service_report_materials" USING btree ("coverage_type");
--> statement-breakpoint
CREATE INDEX "amc_srm_material_type_idx" ON "amc_service_report_materials" USING btree ("material_type");
--> statement-breakpoint
CREATE INDEX "amc_srm_sort_order_idx" ON "amc_service_report_materials" USING btree ("sort_order");