CREATE TABLE "lead_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"title" text NOT NULL,
	"date" varchar(50),
	"type" varchar(50) DEFAULT 'System',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_code" varchar(50) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"address" text,
	"product_interested" varchar(255),
	"expected_value" numeric(12, 2) DEFAULT '0',
	"assigned_executive" varchar(255),
	"priority" varchar(50) DEFAULT 'Medium' NOT NULL,
	"status" varchar(50) DEFAULT 'New' NOT NULL,
	"source" varchar(50) DEFAULT 'Web' NOT NULL,
	"linked_client_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_activity_logs" ADD CONSTRAINT "lead_activity_logs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_activity_logs_lead_id_idx" ON "lead_activity_logs" USING btree ("lead_id");