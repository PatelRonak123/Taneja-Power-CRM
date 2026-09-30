CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follow_up_number" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"priority" varchar(50) DEFAULT 'MEDIUM' NOT NULL,
	"scheduled_date" varchar(20) NOT NULL,
	"scheduled_time" varchar(20),
	"assigned_to" uuid,
	"created_by" uuid NOT NULL,
	"customer_id" uuid,
	"lead_id" varchar(255),
	"deal_id" varchar(255),
	"quotation_id" uuid,
	"amc_contract_id" uuid,
	"completed_at" timestamp with time zone,
	"completed_by" uuid,
	"outcome" text,
	"rescheduled_from_id" uuid,
	"next_follow_up_id" uuid,
	"next_follow_up_date" varchar(20),
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follow_ups_follow_up_number_unique" UNIQUE("follow_up_number")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"movement_type" varchar(50) NOT NULL,
	"quantity" integer NOT NULL,
	"previous_quantity" integer NOT NULL,
	"new_quantity" integer NOT NULL,
	"reference_type" varchar(50) NOT NULL,
	"reference_id" varchar(255),
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "work_type" varchar(50) DEFAULT 'OFFICE' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "assigned_employee_id" varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "created_by" varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "created_by_id" varchar(255);--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_deal_id_leads_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_amc_contract_id_amc_contracts_id_fk" FOREIGN KEY ("amc_contract_id") REFERENCES "public"."amc_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follow_ups_number_idx" ON "follow_ups" USING btree ("follow_up_number");--> statement-breakpoint
CREATE INDEX "follow_ups_status_idx" ON "follow_ups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "follow_ups_priority_idx" ON "follow_ups" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "follow_ups_type_idx" ON "follow_ups" USING btree ("type");--> statement-breakpoint
CREATE INDEX "follow_ups_scheduled_date_idx" ON "follow_ups" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "follow_ups_assigned_to_idx" ON "follow_ups" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "follow_ups_created_by_idx" ON "follow_ups" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "follow_ups_customer_id_idx" ON "follow_ups" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "follow_ups_lead_id_idx" ON "follow_ups" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "follow_ups_deal_id_idx" ON "follow_ups" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "follow_ups_quotation_id_idx" ON "follow_ups" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "follow_ups_amc_contract_id_idx" ON "follow_ups" USING btree ("amc_contract_id");--> statement-breakpoint
CREATE INDEX "follow_ups_created_at_idx" ON "follow_ups" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_movements_movement_type_idx" ON "stock_movements" USING btree ("movement_type");--> statement-breakpoint
CREATE INDEX "stock_movements_reference_type_idx" ON "stock_movements" USING btree ("reference_type");--> statement-breakpoint
CREATE INDEX "stock_movements_reference_id_idx" ON "stock_movements" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements" USING btree ("created_at");