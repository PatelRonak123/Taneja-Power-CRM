CREATE TABLE "sales_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name_snapshot" varchar(255) NOT NULL,
	"sku_snapshot" varchar(100),
	"description_snapshot" text,
	"hsn_sac_snapshot" varchar(50),
	"unit_snapshot" varchar(50) DEFAULT 'NOS' NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"line_subtotal" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"line_total" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_order_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prefix" varchar(20) NOT NULL,
	"financial_year" varchar(20) NOT NULL,
	"current_sequence" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_order_number" varchar(100) NOT NULL,
	"customer_id" uuid NOT NULL,
	"quotation_id" uuid NOT NULL,
	"quotation_revision_id" uuid NOT NULL,
	"customer_po_number" varchar(100),
	"customer_po_date" timestamp with time zone,
	"order_date" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_delivery_date" timestamp with time zone,
	"billing_address" text,
	"billing_city" varchar(100),
	"billing_state" varchar(100),
	"billing_pincode" varchar(20),
	"shipping_name" varchar(255),
	"shipping_address" text,
	"shipping_city" varchar(100),
	"shipping_state" varchar(100),
	"shipping_pincode" varchar(20),
	"payment_terms" text,
	"notes" text,
	"subtotal" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid NOT NULL,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_orders_sales_order_number_unique" UNIQUE("sales_order_number")
);
--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_quotation_revision_id_quotation_revisions_id_fk" FOREIGN KEY ("quotation_revision_id") REFERENCES "public"."quotation_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sales_order_items_so_id_idx" ON "sales_order_items" USING btree ("sales_order_id");--> statement-breakpoint
CREATE INDEX "sales_order_items_product_id_idx" ON "sales_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sales_order_items_sort_order_idx" ON "sales_order_items" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_sequences_prefix_fy_idx" ON "sales_order_sequences" USING btree ("prefix","financial_year");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_orders_so_number_idx" ON "sales_orders" USING btree ("sales_order_number");--> statement-breakpoint
CREATE INDEX "sales_orders_customer_id_idx" ON "sales_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sales_orders_quotation_id_idx" ON "sales_orders" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "sales_orders_status_idx" ON "sales_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sales_orders_order_date_idx" ON "sales_orders" USING btree ("order_date");--> statement-breakpoint
CREATE INDEX "sales_orders_created_by_idx" ON "sales_orders" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "sales_orders_created_at_idx" ON "sales_orders" USING btree ("created_at");