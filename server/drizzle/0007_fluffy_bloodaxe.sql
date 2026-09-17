ALTER TABLE "lead_activity_logs" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "lead_activity_logs" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "lead_activity_logs" ALTER COLUMN "lead_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "current_latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "current_longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "location_accuracy" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "last_location_updated_at" timestamp with time zone;