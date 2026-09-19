CREATE TABLE "quotation_amc_escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_revision_id" uuid NOT NULL,
	"level" varchar(20) NOT NULL,
	"contact_name" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_amc_exclusions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_revision_id" uuid NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_amc_scope_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_revision_id" uuid NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "equipment_type" varchar(100);--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "equipment_configuration" varchar(100);--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "equipment_rating" varchar(100);--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD COLUMN "amc_plan" varchar(100);--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD COLUMN "amc_start_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD COLUMN "amc_end_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD COLUMN "amc_service_frequency" varchar(50);--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD COLUMN "amc_scheduled_visits" integer;--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD COLUMN "amc_breakdown_visit_type" varchar(50);--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD COLUMN "end_user" varchar(255);--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD COLUMN "customer_code" varchar(100);--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD COLUMN "branch" varchar(100);--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD COLUMN "zone" varchar(100);--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD COLUMN "special_clauses" text;--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD COLUMN "amc_payment_terms" text;--> statement-breakpoint
ALTER TABLE "quotation_amc_escalations" ADD CONSTRAINT "quotation_amc_escalations_quotation_revision_id_quotation_revisions_id_fk" FOREIGN KEY ("quotation_revision_id") REFERENCES "public"."quotation_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_amc_exclusions" ADD CONSTRAINT "quotation_amc_exclusions_quotation_revision_id_quotation_revisions_id_fk" FOREIGN KEY ("quotation_revision_id") REFERENCES "public"."quotation_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_amc_scope_items" ADD CONSTRAINT "quotation_amc_scope_items_quotation_revision_id_quotation_revisions_id_fk" FOREIGN KEY ("quotation_revision_id") REFERENCES "public"."quotation_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quotation_amc_escalations_revision_id_idx" ON "quotation_amc_escalations" USING btree ("quotation_revision_id");--> statement-breakpoint
CREATE INDEX "quotation_amc_escalations_level_idx" ON "quotation_amc_escalations" USING btree ("level");--> statement-breakpoint
CREATE INDEX "quotation_amc_exclusions_revision_id_idx" ON "quotation_amc_exclusions" USING btree ("quotation_revision_id");--> statement-breakpoint
CREATE INDEX "quotation_amc_exclusions_sort_order_idx" ON "quotation_amc_exclusions" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "quotation_amc_scope_items_revision_id_idx" ON "quotation_amc_scope_items" USING btree ("quotation_revision_id");--> statement-breakpoint
CREATE INDEX "quotation_amc_scope_items_sort_order_idx" ON "quotation_amc_scope_items" USING btree ("sort_order");