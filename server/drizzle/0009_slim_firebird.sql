CREATE TABLE "quotation_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"quotation_revision_id" uuid,
	"user_id" uuid,
	"action" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"quotation_revision_id" uuid NOT NULL,
	"requested_by_id" uuid NOT NULL,
	"reviewed_by_id" uuid,
	"action" varchar(50) NOT NULL,
	"comments" text,
	"action_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"quotation_revision_id" uuid,
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
CREATE TABLE "quotation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_revision_id" uuid NOT NULL,
	"quotation_id" uuid NOT NULL,
	"product_id" uuid,
	"item_type" varchar(50) DEFAULT 'PRODUCT' NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"product_sku" varchar(100),
	"description" text,
	"make" varchar(100),
	"model" varchar(100),
	"technical_specifications" text,
	"hsn_sac" varchar(50),
	"unit" varchar(50) DEFAULT 'NOS' NOT NULL,
	"quantity" numeric(12, 3) DEFAULT '1.000' NOT NULL,
	"unit_price" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"taxable_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"gst_rate" numeric(5, 2) DEFAULT '18.00' NOT NULL,
	"cgst_rate" numeric(5, 2) DEFAULT '9.00' NOT NULL,
	"cgst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"sgst_rate" numeric(5, 2) DEFAULT '9.00' NOT NULL,
	"sgst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"igst_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"igst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_tax" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"line_total" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"service_duration_months" integer,
	"service_visits_included" integer,
	"service_scope" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"revision_number" integer DEFAULT 1 NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"quotation_date" timestamp with time zone DEFAULT now() NOT NULL,
	"validity_days" integer DEFAULT 30 NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"company_name" varchar(255),
	"customer_email" varchar(255),
	"customer_phone" varchar(50),
	"customer_gstin" varchar(50),
	"customer_pan" varchar(50),
	"billing_address" text,
	"billing_city" varchar(100),
	"billing_state" varchar(100),
	"billing_pincode" varchar(20),
	"billing_state_code" varchar(10),
	"shipping_name" varchar(255),
	"shipping_address" text,
	"shipping_city" varchar(100),
	"shipping_state" varchar(100),
	"shipping_pincode" varchar(20),
	"shipping_state_code" varchar(10),
	"subtotal" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_discount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"taxable_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"cgst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"sgst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"igst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_tax" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"freight_charges" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"other_charges" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"round_off" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"grand_total" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"amount_in_words" text,
	"subject" varchar(500),
	"terms_and_conditions" text,
	"payment_terms" text,
	"delivery_terms" text,
	"warranty_terms" text,
	"notes" text,
	"internal_remarks" text,
	"revision_reason" text,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prefix" varchar(50) DEFAULT 'QT' NOT NULL,
	"financial_year" varchar(20) NOT NULL,
	"current_sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_number" varchar(100) NOT NULL,
	"quotation_type" varchar(50) DEFAULT 'PRODUCT' NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"customer_id" uuid NOT NULL,
	"destination_id" uuid,
	"salesperson_id" uuid NOT NULL,
	"created_by_id" uuid NOT NULL,
	"updated_by_id" uuid,
	"current_revision_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotations_quotation_number_unique" UNIQUE("quotation_number")
);
--> statement-breakpoint
ALTER TABLE "quotation_activity_logs" ADD CONSTRAINT "quotation_activity_logs_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_activity_logs" ADD CONSTRAINT "quotation_activity_logs_quotation_revision_id_quotation_revisions_id_fk" FOREIGN KEY ("quotation_revision_id") REFERENCES "public"."quotation_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_activity_logs" ADD CONSTRAINT "quotation_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_approvals" ADD CONSTRAINT "quotation_approvals_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_approvals" ADD CONSTRAINT "quotation_approvals_quotation_revision_id_quotation_revisions_id_fk" FOREIGN KEY ("quotation_revision_id") REFERENCES "public"."quotation_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_approvals" ADD CONSTRAINT "quotation_approvals_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_approvals" ADD CONSTRAINT "quotation_approvals_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_attachments" ADD CONSTRAINT "quotation_attachments_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_attachments" ADD CONSTRAINT "quotation_attachments_quotation_revision_id_quotation_revisions_id_fk" FOREIGN KEY ("quotation_revision_id") REFERENCES "public"."quotation_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_attachments" ADD CONSTRAINT "quotation_attachments_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_revision_id_quotation_revisions_id_fk" FOREIGN KEY ("quotation_revision_id") REFERENCES "public"."quotation_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD CONSTRAINT "quotation_revisions_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD CONSTRAINT "quotation_revisions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_destination_id_customer_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."customer_destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_salesperson_id_users_id_fk" FOREIGN KEY ("salesperson_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quotation_activity_logs_quotation_id_idx" ON "quotation_activity_logs" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotation_activity_logs_quotation_revision_id_idx" ON "quotation_activity_logs" USING btree ("quotation_revision_id");--> statement-breakpoint
CREATE INDEX "quotation_activity_logs_user_id_idx" ON "quotation_activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quotation_activity_logs_action_idx" ON "quotation_activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "quotation_activity_logs_created_at_idx" ON "quotation_activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "quotation_approvals_quotation_id_idx" ON "quotation_approvals" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotation_approvals_quotation_revision_id_idx" ON "quotation_approvals" USING btree ("quotation_revision_id");--> statement-breakpoint
CREATE INDEX "quotation_approvals_requested_by_id_idx" ON "quotation_approvals" USING btree ("requested_by_id");--> statement-breakpoint
CREATE INDEX "quotation_approvals_reviewed_by_id_idx" ON "quotation_approvals" USING btree ("reviewed_by_id");--> statement-breakpoint
CREATE INDEX "quotation_approvals_action_at_idx" ON "quotation_approvals" USING btree ("action_at");--> statement-breakpoint
CREATE INDEX "quotation_attachments_quotation_id_idx" ON "quotation_attachments" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotation_attachments_quotation_revision_id_idx" ON "quotation_attachments" USING btree ("quotation_revision_id");--> statement-breakpoint
CREATE INDEX "quotation_attachments_uploaded_by_id_idx" ON "quotation_attachments" USING btree ("uploaded_by_id");--> statement-breakpoint
CREATE INDEX "quotation_attachments_created_at_idx" ON "quotation_attachments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "quotation_items_quotation_revision_id_idx" ON "quotation_items" USING btree ("quotation_revision_id");--> statement-breakpoint
CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotation_items_product_id_idx" ON "quotation_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "quotation_items_sort_order_idx" ON "quotation_items" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_revisions_quotation_revision_unique_idx" ON "quotation_revisions" USING btree ("quotation_id","revision_number");--> statement-breakpoint
CREATE INDEX "quotation_revisions_quotation_id_idx" ON "quotation_revisions" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotation_revisions_status_idx" ON "quotation_revisions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotation_revisions_quotation_date_idx" ON "quotation_revisions" USING btree ("quotation_date");--> statement-breakpoint
CREATE INDEX "quotation_revisions_valid_until_idx" ON "quotation_revisions" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "quotation_revisions_created_by_id_idx" ON "quotation_revisions" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "quotation_revisions_created_at_idx" ON "quotation_revisions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_sequences_prefix_year_unique_idx" ON "quotation_sequences" USING btree ("prefix","financial_year");--> statement-breakpoint
CREATE UNIQUE INDEX "quotations_quotation_number_idx" ON "quotations" USING btree ("quotation_number");--> statement-breakpoint
CREATE INDEX "quotations_customer_id_idx" ON "quotations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "quotations_destination_id_idx" ON "quotations" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "quotations_salesperson_id_idx" ON "quotations" USING btree ("salesperson_id");--> statement-breakpoint
CREATE INDEX "quotations_created_by_id_idx" ON "quotations" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "quotations_status_idx" ON "quotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotations_quotation_type_idx" ON "quotations" USING btree ("quotation_type");--> statement-breakpoint
CREATE INDEX "quotations_created_at_idx" ON "quotations" USING btree ("created_at");