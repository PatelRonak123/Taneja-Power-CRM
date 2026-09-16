ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(50);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "designation" varchar(100);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'ACTIVE' NOT NULL;
--> statement-breakpoint
UPDATE "users" SET "status" = 'ACTIVE' WHERE "status" IS NULL;