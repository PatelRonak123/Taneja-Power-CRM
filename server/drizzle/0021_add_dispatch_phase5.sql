ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "dispatch_status" varchar(50) DEFAULT 'NOT_DISPATCHED' NOT NULL;
--> statement-breakpoint
CREATE TABLE "dispatches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispatch_number" varchar(50) NOT NULL,
	"delivery_challan_number" varchar(50) NOT NULL,
	"sales_order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"sales_invoice_id" uuid,
	"dispatch_date" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"vehicle_number" varchar(50),
	"transporter_name" varchar(255),
	"transporter_contact" varchar(100),
	"driver_name" varchar(255),
	"driver_phone" varchar(50),
	"customer_name_snapshot" varchar(255),
	"customer_gstin_snapshot" varchar(50),
	"shipping_name" varchar(255),
	"shipping_address" text,
	"shipping_city" varchar(100),
	"shipping_state" varchar(100),
	"shipping_pincode" varchar(20),
	"notes" text,
	"created_by_id" uuid NOT NULL,
	"dispatched_by_id" uuid,
	"dispatched_at" timestamp with time zone,
	"cancelled_by_id" uuid,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dispatches_dispatch_number_unique" UNIQUE("dispatch_number")
);
--> statement-breakpoint
CREATE TABLE "dispatch_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispatch_id" uuid NOT NULL,
	"sales_order_item_id" uuid NOT NULL,
	"sales_invoice_item_id" uuid,
	"product_id" uuid NOT NULL,
	"product_name_snapshot" varchar(255) NOT NULL,
	"sku_snapshot" varchar(100),
	"description_snapshot" text,
	"hsn_sac_snapshot" varchar(50),
	"unit_snapshot" varchar(50) DEFAULT 'NOS' NOT NULL,
	"ordered_quantity" numeric(12, 3) NOT NULL,
	"invoiced_quantity" numeric(12, 3) DEFAULT '0' NOT NULL,
	"previously_dispatched_quantity" numeric(12, 3) DEFAULT '0' NOT NULL,
	"dispatch_quantity" numeric(12, 3) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatch_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prefix" varchar(20) DEFAULT 'DC' NOT NULL,
	"financial_year" varchar(20) NOT NULL,
	"current_sequence" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatch_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispatch_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"actor_id" uuid,
	"notes" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_sales_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_dispatched_by_id_users_id_fk" FOREIGN KEY ("dispatched_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_cancelled_by_id_users_id_fk" FOREIGN KEY ("cancelled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_dispatch_id_dispatches_id_fk" FOREIGN KEY ("dispatch_id") REFERENCES "public"."dispatches"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_sales_order_item_id_sales_order_items_id_fk" FOREIGN KEY ("sales_order_item_id") REFERENCES "public"."sales_order_items"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_sales_invoice_item_id_sales_invoice_items_id_fk" FOREIGN KEY ("sales_invoice_item_id") REFERENCES "public"."sales_invoice_items"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dispatch_activity_logs" ADD CONSTRAINT "dispatch_activity_logs_dispatch_id_dispatches_id_fk" FOREIGN KEY ("dispatch_id") REFERENCES "public"."dispatches"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dispatch_activity_logs" ADD CONSTRAINT "dispatch_activity_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "dispatches_sales_order_id_idx" ON "dispatches" USING btree ("sales_order_id");
--> statement-breakpoint
CREATE INDEX "dispatches_customer_id_idx" ON "dispatches" USING btree ("customer_id");
--> statement-breakpoint
CREATE INDEX "dispatches_sales_invoice_id_idx" ON "dispatches" USING btree ("sales_invoice_id");
--> statement-breakpoint
CREATE INDEX "dispatches_status_idx" ON "dispatches" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "dispatches_dispatch_date_idx" ON "dispatches" USING btree ("dispatch_date");
--> statement-breakpoint
CREATE INDEX "dispatch_items_dispatch_id_idx" ON "dispatch_items" USING btree ("dispatch_id");
--> statement-breakpoint
CREATE INDEX "dispatch_items_sales_order_item_id_idx" ON "dispatch_items" USING btree ("sales_order_item_id");
--> statement-breakpoint
CREATE INDEX "dispatch_items_product_id_idx" ON "dispatch_items" USING btree ("product_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "dispatch_sequences_prefix_fy_idx" ON "dispatch_sequences" USING btree ("prefix","financial_year");
--> statement-breakpoint
CREATE INDEX "dispatch_activity_logs_dispatch_id_idx" ON "dispatch_activity_logs" USING btree ("dispatch_id");
--> statement-breakpoint
CREATE INDEX "dispatch_activity_logs_created_at_idx" ON "dispatch_activity_logs" USING btree ("created_at");
