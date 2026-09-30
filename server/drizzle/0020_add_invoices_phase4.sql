CREATE TABLE "sales_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"sales_order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_date" timestamp with time zone DEFAULT now() NOT NULL,
	"due_date" timestamp with time zone,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"legal_name" varchar(255),
	"gstin" varchar(50),
	"pan" varchar(50),
	"customer_email" varchar(255),
	"customer_phone" varchar(50),
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
	"payment_terms" text,
	"notes" text,
	"subtotal" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"taxable_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"cgst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"sgst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"igst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_tax" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"round_off" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"created_by" uuid NOT NULL,
	"issued_by" uuid,
	"issued_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "sales_invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_invoice_id" uuid NOT NULL,
	"sales_order_item_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name_snapshot" varchar(255) NOT NULL,
	"sku_snapshot" varchar(100),
	"description_snapshot" text,
	"hsn_sac_snapshot" varchar(50),
	"unit_snapshot" varchar(50) DEFAULT 'NOS' NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"taxable_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '18.00' NOT NULL,
	"cgst_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"sgst_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"igst_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"cgst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"sgst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"igst_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"line_total" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prefix" varchar(20) NOT NULL,
	"financial_year" varchar(20) NOT NULL,
	"current_sequence" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_invoice_number" varchar(100) NOT NULL,
	"supplier_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"goods_receipt_id" uuid,
	"invoice_date" timestamp with time zone DEFAULT now() NOT NULL,
	"due_date" timestamp with time zone,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"posted_by" uuid,
	"posted_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_invoice_id" uuid NOT NULL,
	"purchase_order_item_id" uuid NOT NULL,
	"goods_receipt_item_id" uuid,
	"product_id" uuid NOT NULL,
	"sku_snapshot" varchar(100),
	"product_name_snapshot" varchar(255) NOT NULL,
	"description_snapshot" text,
	"ordered_quantity" integer NOT NULL,
	"received_quantity" integer NOT NULL,
	"invoiced_quantity" integer NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"line_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_type" varchar(50) NOT NULL,
	"invoice_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"user_id" uuid NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_sales_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_sales_order_item_id_sales_order_items_id_fk" FOREIGN KEY ("sales_order_item_id") REFERENCES "public"."sales_order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_goods_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoice_items" ADD CONSTRAINT "vendor_invoice_items_vendor_invoice_id_vendor_invoices_id_fk" FOREIGN KEY ("vendor_invoice_id") REFERENCES "public"."vendor_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoice_items" ADD CONSTRAINT "vendor_invoice_items_purchase_order_item_id_purchase_order_items_id_fk" FOREIGN KEY ("purchase_order_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoice_items" ADD CONSTRAINT "vendor_invoice_items_goods_receipt_item_id_goods_receipt_items_id_fk" FOREIGN KEY ("goods_receipt_item_id") REFERENCES "public"."goods_receipt_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoice_items" ADD CONSTRAINT "vendor_invoice_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_activity_logs" ADD CONSTRAINT "invoice_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_invoices_invoice_number_idx" ON "sales_invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "sales_invoices_sales_order_id_idx" ON "sales_invoices" USING btree ("sales_order_id");--> statement-breakpoint
CREATE INDEX "sales_invoices_customer_id_idx" ON "sales_invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sales_invoices_status_idx" ON "sales_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sales_invoices_invoice_date_idx" ON "sales_invoices" USING btree ("invoice_date");--> statement-breakpoint
CREATE INDEX "sales_invoices_created_by_idx" ON "sales_invoices" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "sales_invoice_items_invoice_id_idx" ON "sales_invoice_items" USING btree ("sales_invoice_id");--> statement-breakpoint
CREATE INDEX "sales_invoice_items_so_item_id_idx" ON "sales_invoice_items" USING btree ("sales_order_item_id");--> statement-breakpoint
CREATE INDEX "sales_invoice_items_product_id_idx" ON "sales_invoice_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_sequences_prefix_fy_idx" ON "invoice_sequences" USING btree ("prefix","financial_year");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_invoices_supplier_invoice_num_idx" ON "vendor_invoices" USING btree ("supplier_id","vendor_invoice_number");--> statement-breakpoint
CREATE INDEX "vendor_invoices_supplier_id_idx" ON "vendor_invoices" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "vendor_invoices_po_id_idx" ON "vendor_invoices" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "vendor_invoices_grn_id_idx" ON "vendor_invoices" USING btree ("goods_receipt_id");--> statement-breakpoint
CREATE INDEX "vendor_invoices_status_idx" ON "vendor_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vendor_invoices_invoice_date_idx" ON "vendor_invoices" USING btree ("invoice_date");--> statement-breakpoint
CREATE INDEX "vendor_invoice_items_invoice_id_idx" ON "vendor_invoice_items" USING btree ("vendor_invoice_id");--> statement-breakpoint
CREATE INDEX "vendor_invoice_items_po_item_id_idx" ON "vendor_invoice_items" USING btree ("purchase_order_item_id");--> statement-breakpoint
CREATE INDEX "vendor_invoice_items_grn_item_id_idx" ON "vendor_invoice_items" USING btree ("goods_receipt_item_id");--> statement-breakpoint
CREATE INDEX "vendor_invoice_items_product_id_idx" ON "vendor_invoice_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "invoice_activity_logs_invoice_id_idx" ON "invoice_activity_logs" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_activity_logs_user_id_idx" ON "invoice_activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invoice_activity_logs_action_idx" ON "invoice_activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "invoice_activity_logs_created_at_idx" ON "invoice_activity_logs" USING btree ("created_at");
