DROP INDEX "hazard_events_occurred_at_idx";--> statement-breakpoint
-- Existing events all come from instantaneous sources, so they stop being
-- active when they occur. Backfill before enforcing the constraint.
ALTER TABLE "hazard_events" ADD COLUMN "active_until" timestamp with time zone;--> statement-breakpoint
UPDATE "hazard_events" SET "active_until" = "occurred_at";--> statement-breakpoint
ALTER TABLE "hazard_events" ALTER COLUMN "active_until" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "hazard_events_active_until_idx" ON "hazard_events" USING btree ("active_until" DESC NULLS LAST);
