ALTER TABLE "watch_zones" ADD COLUMN "email_alerts" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "zone_alerts" ADD COLUMN "emailed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "zone_alerts_pending_email_idx" ON "zone_alerts" USING btree ("raised_at") WHERE "zone_alerts"."emailed_at" is null;