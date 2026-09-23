ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "work_type" varchar(50) DEFAULT 'OFFICE' NOT NULL;
--> statement-breakpoint
UPDATE "users" SET "work_type" = 'OFFICE', "designation" = COALESCE("designation", 'Head of Operations') WHERE "email" = 'admin@tanejapower.com';
--> statement-breakpoint
UPDATE "users" SET "work_type" = 'FIELD', "designation" = COALESCE("designation", 'Sales') WHERE "email" IN ('viks@gmail.com', 'ansh@gmail.com');
--> statement-breakpoint
UPDATE "users" SET "work_type" = 'FIELD' WHERE "designation" IN ('Field Service Engineer', 'Solar Technician', 'Sales Representative', 'Senior Field Service Engineer', 'Junior Engineer', 'Field Engineer', 'Sales Executive', 'Sales', 'Service');
