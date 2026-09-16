CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"company_name" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"pincode" varchar(20),
	"notes" text,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "name" varchar(255);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "company_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "phone" varchar(50);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "email" varchar(255);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "address" text;
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "city" varchar(100);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "state" varchar(100);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "pincode" varchar(20);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "notes" text;
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'ACTIVE';
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"pincode" varchar(20),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"contact_person" varchar(255),
	"contact_phone" varchar(50),
	"notes" text,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_destinations" ADD COLUMN IF NOT EXISTS "latitude" numeric(10, 7);
--> statement-breakpoint
ALTER TABLE "customer_destinations" ADD COLUMN IF NOT EXISTS "longitude" numeric(10, 7);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customer_destinations_customer_id_customers_id_fk'
  ) THEN
    ALTER TABLE "customer_destinations" ADD CONSTRAINT "customer_destinations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_destinations_customer_id_idx" ON "customer_destinations" USING btree ("customer_id");