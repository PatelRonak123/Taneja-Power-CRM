DROP TABLE IF EXISTS "attendance" CASCADE;
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"check_in_at" timestamp with time zone NOT NULL,
	"check_in_latitude" numeric(10, 7),
	"check_in_longitude" numeric(10, 7),
	"check_out_at" timestamp with time zone,
	"check_out_latitude" numeric(10, 7),
	"check_out_longitude" numeric(10, 7),
	"total_minutes" integer,
	"status" varchar(50) DEFAULT 'CHECKED_IN' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_employee_date_unique_idx" ON "attendance" USING btree ("employee_id","attendance_date");--> statement-breakpoint
CREATE INDEX "attendance_employee_id_idx" ON "attendance" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "attendance_date_idx" ON "attendance" USING btree ("attendance_date");--> statement-breakpoint
CREATE INDEX "attendance_status_idx" ON "attendance" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attendance_check_in_at_idx" ON "attendance" USING btree ("check_in_at");--> statement-breakpoint
CREATE INDEX "attendance_created_at_idx" ON "attendance" USING btree ("created_at");