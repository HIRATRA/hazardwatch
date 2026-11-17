CREATE TABLE "watch_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"center" geometry(Point, 4326) NOT NULL,
	"radius_km" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watch_zones_radius_km_check" CHECK ("watch_zones"."radius_km" between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "watch_zones" ADD CONSTRAINT "watch_zones_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "watch_zones_user_id_idx" ON "watch_zones" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hazard_events_location_geography_idx" ON "hazard_events" USING gist (("location"::geography));