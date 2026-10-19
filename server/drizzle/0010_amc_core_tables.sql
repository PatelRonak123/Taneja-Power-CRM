-- Migration: 0010_amc_core_tables
-- Creates Phase 5 Core AMC Contract & Service Visit tables required prior to Phase 6 Material Tracking (0011).

CREATE TABLE IF NOT EXISTS "amc_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_number" varchar(100) NOT NULL,
	"quotation_id" uuid NOT NULL,
	"quotation_revision_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"destination_id" uuid,
	"customer_name" varchar(255) NOT NULL,
	"company_name" varchar(255),
	"end_user" varchar(255),
	"customer_code" varchar(100),
	"branch" varchar(100),
	"zone" varchar(100),
	"amc_plan" varchar(100) NOT NULL,
	"contract_start_date" timestamp with time zone NOT NULL,
	"contract_end_date" timestamp with time zone NOT NULL,
	"service_frequency" varchar(50) NOT NULL,
	"scheduled_visits" integer DEFAULT 4 NOT NULL,
	"completed_visits" integer DEFAULT 0 NOT NULL,
	"breakdown_visit_type" varchar(50) DEFAULT 'UNLIMITED' NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING_ACTIVATION' NOT NULL,
	"payment_status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"special_clauses" text,
	"amc_payment_terms" text,
	"termination_reason" text,
	"terminated_at" timestamp with time zone,
	"created_by_id" uuid NOT NULL,
	"updated_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "amc_contracts_contract_number_unique" UNIQUE("contract_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_contract_equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amc_contract_id" uuid NOT NULL,
	"quotation_item_id" uuid,
	"equipment_type" varchar(100),
	"equipment_name" varchar(255) NOT NULL,
	"configuration" varchar(100),
	"rating" varchar(100),
	"make" varchar(100),
	"model" varchar(100),
	"quantity" numeric(10, 3) DEFAULT '1.000' NOT NULL,
	"unit_price" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"line_total" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_contract_scope_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amc_contract_id" uuid NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_contract_exclusions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amc_contract_id" uuid NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_contract_escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amc_contract_id" uuid NOT NULL,
	"level" varchar(20) NOT NULL,
	"contact_name" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_service_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amc_contract_id" uuid NOT NULL,
	"visit_number" integer NOT NULL,
	"scheduled_date" timestamp with time zone NOT NULL,
	"service_type" varchar(50) DEFAULT 'PREVENTIVE' NOT NULL,
	"status" varchar(50) DEFAULT 'SCHEDULED' NOT NULL,
	"assigned_employee_id" uuid,
	"task_id" uuid,
	"actual_start_at" timestamp with time zone,
	"actual_end_at" timestamp with time zone,
	"technician_employee_id" uuid,
	"technician_notes" text,
	"customer_remarks" text,
	"visit_outcome" varchar(50),
	"completed_by" uuid,
	"completed_at" timestamp with time zone,
	"cancellation_reason" text,
	"cancelled_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amc_contract_id" uuid NOT NULL,
	"request_number" varchar(100) NOT NULL,
	"service_type" varchar(50) DEFAULT 'BREAKDOWN' NOT NULL,
	"issue_description" text NOT NULL,
	"priority" varchar(50) DEFAULT 'HIGH' NOT NULL,
	"status" varchar(50) DEFAULT 'OPEN' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_employee_id" uuid,
	"task_id" uuid,
	"resolved_at" timestamp with time zone,
	"notes" text,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "amc_service_requests_request_number_unique" UNIQUE("request_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_service_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amc_contract_id" uuid NOT NULL,
	"amc_service_visit_id" uuid NOT NULL,
	"report_number" varchar(100) NOT NULL,
	"service_type" varchar(50) DEFAULT 'PREVENTIVE' NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"inspection_date" timestamp with time zone DEFAULT now() NOT NULL,
	"technician_employee_id" uuid,
	"service_summary" text,
	"observations" text,
	"recommendations" text,
	"customer_name" varchar(255),
	"customer_remarks" text,
	"acknowledgement_status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"customer_signature_ref" text,
	"created_by_id" uuid NOT NULL,
	"updated_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "amc_service_reports_report_number_unique" UNIQUE("report_number"),
	CONSTRAINT "amc_service_reports_amc_service_visit_id_unique" UNIQUE("amc_service_visit_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_service_report_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_report_id" uuid NOT NULL,
	"scope_item_id" uuid,
	"scope_description" text NOT NULL,
	"status" varchar(50) DEFAULT 'COMPLETED' NOT NULL,
	"remarks" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_service_report_equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_report_id" uuid NOT NULL,
	"equipment_id" uuid,
	"equipment_name" varchar(255) NOT NULL,
	"configuration" varchar(100),
	"rating" varchar(100),
	"condition_status" varchar(50) DEFAULT 'OPERATIONAL' NOT NULL,
	"observations" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_service_report_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_report_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" text NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prefix" varchar(50) DEFAULT 'AMC' NOT NULL,
	"financial_year" varchar(20) NOT NULL,
	"current_sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_contracts" ADD CONSTRAINT "amc_contracts_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_contracts" ADD CONSTRAINT "amc_contracts_quotation_revision_id_quotation_revisions_id_fk" FOREIGN KEY ("quotation_revision_id") REFERENCES "public"."quotation_revisions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_contracts" ADD CONSTRAINT "amc_contracts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_contracts" ADD CONSTRAINT "amc_contracts_destination_id_customer_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."customer_destinations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_contracts" ADD CONSTRAINT "amc_contracts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_contracts" ADD CONSTRAINT "amc_contracts_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_contract_equipment" ADD CONSTRAINT "amc_contract_equipment_amc_contract_id_amc_contracts_id_fk" FOREIGN KEY ("amc_contract_id") REFERENCES "public"."amc_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_contract_equipment" ADD CONSTRAINT "amc_contract_equipment_quotation_item_id_quotation_items_id_fk" FOREIGN KEY ("quotation_item_id") REFERENCES "public"."quotation_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_contract_scope_items" ADD CONSTRAINT "amc_contract_scope_items_amc_contract_id_amc_contracts_id_fk" FOREIGN KEY ("amc_contract_id") REFERENCES "public"."amc_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_contract_exclusions" ADD CONSTRAINT "amc_contract_exclusions_amc_contract_id_amc_contracts_id_fk" FOREIGN KEY ("amc_contract_id") REFERENCES "public"."amc_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_contract_escalations" ADD CONSTRAINT "amc_contract_escalations_amc_contract_id_amc_contracts_id_fk" FOREIGN KEY ("amc_contract_id") REFERENCES "public"."amc_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_visits" ADD CONSTRAINT "amc_service_visits_amc_contract_id_amc_contracts_id_fk" FOREIGN KEY ("amc_contract_id") REFERENCES "public"."amc_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_visits" ADD CONSTRAINT "amc_service_visits_assigned_employee_id_users_id_fk" FOREIGN KEY ("assigned_employee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_visits" ADD CONSTRAINT "amc_service_visits_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_visits" ADD CONSTRAINT "amc_service_visits_technician_employee_id_users_id_fk" FOREIGN KEY ("technician_employee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_visits" ADD CONSTRAINT "amc_service_visits_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_requests" ADD CONSTRAINT "amc_service_requests_amc_contract_id_amc_contracts_id_fk" FOREIGN KEY ("amc_contract_id") REFERENCES "public"."amc_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_requests" ADD CONSTRAINT "amc_service_requests_assigned_employee_id_users_id_fk" FOREIGN KEY ("assigned_employee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_requests" ADD CONSTRAINT "amc_service_requests_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_requests" ADD CONSTRAINT "amc_service_requests_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_reports" ADD CONSTRAINT "amc_service_reports_amc_contract_id_amc_contracts_id_fk" FOREIGN KEY ("amc_contract_id") REFERENCES "public"."amc_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_reports" ADD CONSTRAINT "amc_service_reports_amc_service_visit_id_amc_service_visits_id_fk" FOREIGN KEY ("amc_service_visit_id") REFERENCES "public"."amc_service_visits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_reports" ADD CONSTRAINT "amc_service_reports_technician_employee_id_users_id_fk" FOREIGN KEY ("technician_employee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_reports" ADD CONSTRAINT "amc_service_reports_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_reports" ADD CONSTRAINT "amc_service_reports_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_report_items" ADD CONSTRAINT "amc_service_report_items_service_report_id_amc_service_reports_id_fk" FOREIGN KEY ("service_report_id") REFERENCES "public"."amc_service_reports"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_report_items" ADD CONSTRAINT "amc_service_report_items_scope_item_id_amc_contract_scope_items_id_fk" FOREIGN KEY ("scope_item_id") REFERENCES "public"."amc_contract_scope_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_report_equipment" ADD CONSTRAINT "amc_service_report_equipment_service_report_id_amc_service_reports_id_fk" FOREIGN KEY ("service_report_id") REFERENCES "public"."amc_service_reports"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_report_equipment" ADD CONSTRAINT "amc_service_report_equipment_equipment_id_amc_contract_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."amc_contract_equipment"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "amc_service_report_attachments" ADD CONSTRAINT "amc_service_report_attachments_service_report_id_amc_service_reports_id_fk" FOREIGN KEY ("service_report_id") REFERENCES "public"."amc_service_reports"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "amc_contracts_contract_number_idx" ON "amc_contracts" USING btree ("contract_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_customer_id_idx" ON "amc_contracts" USING btree ("customer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_destination_id_idx" ON "amc_contracts" USING btree ("destination_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_quotation_id_idx" ON "amc_contracts" USING btree ("quotation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_quotation_revision_id_idx" ON "amc_contracts" USING btree ("quotation_revision_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_status_idx" ON "amc_contracts" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_payment_status_idx" ON "amc_contracts" USING btree ("payment_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_start_date_idx" ON "amc_contracts" USING btree ("contract_start_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_end_date_idx" ON "amc_contracts" USING btree ("contract_end_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_created_at_idx" ON "amc_contracts" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contract_equipment_contract_id_idx" ON "amc_contract_equipment" USING btree ("amc_contract_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contract_equipment_quotation_item_id_idx" ON "amc_contract_equipment" USING btree ("quotation_item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contract_scope_items_contract_id_idx" ON "amc_contract_scope_items" USING btree ("amc_contract_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contract_scope_items_sort_order_idx" ON "amc_contract_scope_items" USING btree ("sort_order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contract_exclusions_contract_id_idx" ON "amc_contract_exclusions" USING btree ("amc_contract_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contract_exclusions_sort_order_idx" ON "amc_contract_exclusions" USING btree ("sort_order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contract_escalations_contract_id_idx" ON "amc_contract_escalations" USING btree ("amc_contract_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contract_escalations_level_idx" ON "amc_contract_escalations" USING btree ("level");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_visits_contract_id_idx" ON "amc_service_visits" USING btree ("amc_contract_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_visits_scheduled_date_idx" ON "amc_service_visits" USING btree ("scheduled_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_visits_status_idx" ON "amc_service_visits" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_visits_assigned_employee_id_idx" ON "amc_service_visits" USING btree ("assigned_employee_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_visits_task_id_idx" ON "amc_service_visits" USING btree ("task_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "amc_service_requests_request_number_idx" ON "amc_service_requests" USING btree ("request_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_requests_contract_id_idx" ON "amc_service_requests" USING btree ("amc_contract_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_requests_status_idx" ON "amc_service_requests" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_requests_priority_idx" ON "amc_service_requests" USING btree ("priority");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_requests_assigned_employee_id_idx" ON "amc_service_requests" USING btree ("assigned_employee_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_requests_task_id_idx" ON "amc_service_requests" USING btree ("task_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "amc_service_reports_visit_unique_idx" ON "amc_service_reports" USING btree ("amc_service_visit_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "amc_service_reports_report_number_idx" ON "amc_service_reports" USING btree ("report_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_reports_contract_id_idx" ON "amc_service_reports" USING btree ("amc_contract_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_reports_status_idx" ON "amc_service_reports" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_reports_technician_id_idx" ON "amc_service_reports" USING btree ("technician_employee_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_report_items_report_id_idx" ON "amc_service_report_items" USING btree ("service_report_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_report_items_sort_order_idx" ON "amc_service_report_items" USING btree ("sort_order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_report_equipment_report_id_idx" ON "amc_service_report_equipment" USING btree ("service_report_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_report_attachments_report_id_idx" ON "amc_service_report_attachments" USING btree ("service_report_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "amc_sequences_prefix_year_unique_idx" ON "amc_sequences" USING btree ("prefix","financial_year");
