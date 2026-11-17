CREATE TABLE "zone_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"severity" "hazard_severity" NOT NULL,
	"raised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "watch_zones" ADD COLUMN "alert_min_severity" "hazard_severity" DEFAULT 'moderate';--> statement-breakpoint
ALTER TABLE "zone_alerts" ADD CONSTRAINT "zone_alerts_zone_id_watch_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."watch_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_alerts" ADD CONSTRAINT "zone_alerts_event_id_hazard_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."hazard_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "zone_alerts_zone_id_event_id_idx" ON "zone_alerts" USING btree ("zone_id","event_id");--> statement-breakpoint
CREATE INDEX "zone_alerts_event_id_idx" ON "zone_alerts" USING btree ("event_id");