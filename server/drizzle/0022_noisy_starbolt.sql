ALTER TABLE "customers" ADD COLUMN "created_by_id" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "created_by" varchar(255);--> statement-breakpoint
ALTER TABLE "amc_contracts" ADD COLUMN "sales_order_id" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amc_contracts" ADD CONSTRAINT "amc_contracts_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_created_by_id_idx" ON "customers" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "amc_contracts_sales_order_id_idx" ON "amc_contracts" USING btree ("sales_order_id");