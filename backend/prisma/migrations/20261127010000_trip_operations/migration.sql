ALTER TABLE "Reservation"
  ADD COLUMN "droppedOffAt" TIMESTAMPTZ(3),
  ADD CONSTRAINT "Reservation_observed_dropoff" CHECK (
    "droppedOffAt" IS NULL OR ("boardedAt" IS NOT NULL AND "noShowAt" IS NULL AND "droppedOffAt" >= "boardedAt")
  );
ALTER TABLE "Trip"
  ADD COLUMN "estimatedDepartureAt" TIMESTAMPTZ(3),
  ADD COLUMN "expiredAt" TIMESTAMPTZ(3),
  ADD CONSTRAINT "Trip_operational_delay" CHECK ("estimatedDepartureAt" IS NULL OR "estimatedDepartureAt" > "departureAt");
CREATE INDEX "Trip_status_expiredAt_expectedEndAt_idx" ON "Trip" ("status","expiredAt","expectedEndAt");
