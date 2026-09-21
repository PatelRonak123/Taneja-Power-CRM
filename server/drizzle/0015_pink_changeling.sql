CREATE TABLE "field_service_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fsr_id" uuid NOT NULL,
	"user_id" uuid,
	"action" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_service_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fsr_id" uuid NOT NULL,
	"category" varchar(50) DEFAULT 'OTHER' NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"stored_file_name" varchar(255) NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"storage_provider" varchar(50) DEFAULT 'LOCAL' NOT NULL,
	"uploaded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_service_battery_banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fsr_id" uuid NOT NULL,
	"bank_number" integer DEFAULT 1 NOT NULL,
	"bank_description" varchar(255),
	"make" varchar(100),
	"ah" varchar(50),
	"quantity" integer DEFAULT 20 NOT NULL,
	"front_indication" varchar(100),
	"voltage" numeric(8, 2),
	"charging_current" numeric(8, 2),
	"discharging_current" numeric(8, 2),
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_service_battery_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fsr_id" uuid NOT NULL,
	"battery_bank_id" uuid NOT NULL,
	"battery_number" integer NOT NULL,
	"charging_voltage" numeric(8, 2),
	"discharging_voltage" numeric(8, 2),
	"internal_resistance" numeric(8, 2),
	"remarks" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_service_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fsr_id" uuid NOT NULL,
	"product_id" uuid,
	"part_name" varchar(255) NOT NULL,
	"part_number" varchar(100),
	"quantity" numeric(10, 2) DEFAULT '1.00' NOT NULL,
	"replacement_details" text,
	"old_part_status" varchar(50),
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_service_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fsr_number" varchar(100) NOT NULL,
	"customer_id" uuid NOT NULL,
	"destination_id" uuid,
	"product_id" uuid,
	"service_engineer_id" uuid NOT NULL,
	"created_by_id" uuid NOT NULL,
	"updated_by_id" uuid,
	"visit_date" timestamp with time zone NOT NULL,
	"problem_reported" text,
	"reason_for_visit" text,
	"call_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"warranty_status" varchar(50) DEFAULT 'UNDER_WARRANTY' NOT NULL,
	"billing_status" varchar(50) DEFAULT 'FREE_SERVICE' NOT NULL,
	"product_model" varchar(255),
	"product_make" varchar(100),
	"product_serial_number" varchar(100),
	"equipment_status" varchar(50) DEFAULT 'WORKING',
	"customer_name" varchar(255) NOT NULL,
	"company_name" varchar(255),
	"customer_phone" varchar(50),
	"customer_email" varchar(255),
	"customer_address" text,
	"charges" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"charges_remarks" text,
	"standby_details" text,
	"fse_feedback" text,
	"customer_feedback" text,
	"customer_contact_name" varchar(255),
	"customer_signature" text,
	"customer_stamp" text,
	"customer_signed_at" timestamp with time zone,
	"fse_name" varchar(255),
	"fse_number" varchar(50),
	"fse_signature" text,
	"fse_signature_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "field_service_reports_fsr_number_unique" UNIQUE("fsr_number")
);
--> statement-breakpoint
CREATE TABLE "field_service_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prefix" varchar(50) DEFAULT 'FSR' NOT NULL,
	"financial_year" varchar(20) NOT NULL,
	"current_sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_service_site_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fsr_id" uuid NOT NULL,
	"input_on_mains" varchar(50),
	"input_voltage_ln" numeric(8, 2),
	"input_voltage_ll" numeric(8, 2),
	"output_voltage_ln" numeric(8, 2),
	"output_voltage_ll" numeric(8, 2),
	"vac" numeric(8, 2),
	"frequency" numeric(6, 2),
	"dc_voltage" numeric(8, 2),
	"output_load_percent" numeric(5, 2),
	"input_frequency" numeric(6, 2),
	"output_frequency" numeric(6, 2),
	"environment_condition" varchar(20),
	"environment_remarks" text,
	"ups_location" varchar(50),
	"other_location_specification" varchar(255),
	"observations_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "field_service_activity_logs" ADD CONSTRAINT "field_service_activity_logs_fsr_id_field_service_reports_id_fk" FOREIGN KEY ("fsr_id") REFERENCES "public"."field_service_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_activity_logs" ADD CONSTRAINT "field_service_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_attachments" ADD CONSTRAINT "field_service_attachments_fsr_id_field_service_reports_id_fk" FOREIGN KEY ("fsr_id") REFERENCES "public"."field_service_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_attachments" ADD CONSTRAINT "field_service_attachments_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_battery_banks" ADD CONSTRAINT "field_service_battery_banks_fsr_id_field_service_reports_id_fk" FOREIGN KEY ("fsr_id") REFERENCES "public"."field_service_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_battery_readings" ADD CONSTRAINT "field_service_battery_readings_fsr_id_field_service_reports_id_fk" FOREIGN KEY ("fsr_id") REFERENCES "public"."field_service_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_battery_readings" ADD CONSTRAINT "field_service_battery_readings_battery_bank_id_field_service_battery_banks_id_fk" FOREIGN KEY ("battery_bank_id") REFERENCES "public"."field_service_battery_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_parts" ADD CONSTRAINT "field_service_parts_fsr_id_field_service_reports_id_fk" FOREIGN KEY ("fsr_id") REFERENCES "public"."field_service_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_parts" ADD CONSTRAINT "field_service_parts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_reports" ADD CONSTRAINT "field_service_reports_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_reports" ADD CONSTRAINT "field_service_reports_destination_id_customer_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."customer_destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_reports" ADD CONSTRAINT "field_service_reports_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_reports" ADD CONSTRAINT "field_service_reports_service_engineer_id_users_id_fk" FOREIGN KEY ("service_engineer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_reports" ADD CONSTRAINT "field_service_reports_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_reports" ADD CONSTRAINT "field_service_reports_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_service_site_observations" ADD CONSTRAINT "field_service_site_observations_fsr_id_field_service_reports_id_fk" FOREIGN KEY ("fsr_id") REFERENCES "public"."field_service_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "field_service_activity_logs_fsr_id_idx" ON "field_service_activity_logs" USING btree ("fsr_id");--> statement-breakpoint
CREATE INDEX "field_service_activity_logs_user_id_idx" ON "field_service_activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "field_service_activity_logs_action_idx" ON "field_service_activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "field_service_activity_logs_created_at_idx" ON "field_service_activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "field_service_attachments_fsr_id_idx" ON "field_service_attachments" USING btree ("fsr_id");--> statement-breakpoint
CREATE INDEX "field_service_attachments_category_idx" ON "field_service_attachments" USING btree ("category");--> statement-breakpoint
CREATE INDEX "field_service_attachments_uploaded_by_id_idx" ON "field_service_attachments" USING btree ("uploaded_by_id");--> statement-breakpoint
CREATE INDEX "field_service_attachments_created_at_idx" ON "field_service_attachments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "field_service_battery_banks_fsr_id_idx" ON "field_service_battery_banks" USING btree ("fsr_id");--> statement-breakpoint
CREATE UNIQUE INDEX "field_service_battery_banks_fsr_bank_unique_idx" ON "field_service_battery_banks" USING btree ("fsr_id","bank_number");--> statement-breakpoint
CREATE INDEX "field_service_battery_readings_fsr_id_idx" ON "field_service_battery_readings" USING btree ("fsr_id");--> statement-breakpoint
CREATE INDEX "field_service_battery_readings_bank_id_idx" ON "field_service_battery_readings" USING btree ("battery_bank_id");--> statement-breakpoint
CREATE UNIQUE INDEX "field_service_battery_readings_bank_battery_idx" ON "field_service_battery_readings" USING btree ("battery_bank_id","battery_number");--> statement-breakpoint
CREATE INDEX "field_service_parts_fsr_id_idx" ON "field_service_parts" USING btree ("fsr_id");--> statement-breakpoint
CREATE INDEX "field_service_parts_product_id_idx" ON "field_service_parts" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "field_service_reports_fsr_number_idx" ON "field_service_reports" USING btree ("fsr_number");--> statement-breakpoint
CREATE INDEX "field_service_reports_customer_id_idx" ON "field_service_reports" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "field_service_reports_destination_id_idx" ON "field_service_reports" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "field_service_reports_product_id_idx" ON "field_service_reports" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "field_service_reports_service_engineer_id_idx" ON "field_service_reports" USING btree ("service_engineer_id");--> statement-breakpoint
CREATE INDEX "field_service_reports_created_by_id_idx" ON "field_service_reports" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "field_service_reports_visit_date_idx" ON "field_service_reports" USING btree ("visit_date");--> statement-breakpoint
CREATE INDEX "field_service_reports_status_idx" ON "field_service_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "field_service_reports_call_type_idx" ON "field_service_reports" USING btree ("call_type");--> statement-breakpoint
CREATE INDEX "field_service_reports_created_at_idx" ON "field_service_reports" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "field_service_sequences_prefix_year_unique_idx" ON "field_service_sequences" USING btree ("prefix","financial_year");--> statement-breakpoint
CREATE UNIQUE INDEX "field_service_site_observations_fsr_id_idx" ON "field_service_site_observations" USING btree ("fsr_id");