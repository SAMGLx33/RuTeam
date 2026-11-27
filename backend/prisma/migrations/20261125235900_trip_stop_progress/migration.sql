ALTER TABLE "Trip"
  ADD COLUMN "startedAt" TIMESTAMPTZ(3),
  ADD COLUMN "finishedAt" TIMESTAMPTZ(3),
  ADD CONSTRAINT "Trip_actual_interval_valid"
    CHECK ("finishedAt" IS NULL OR "startedAt" IS NULL OR "finishedAt" >= "startedAt");
ALTER TABLE "TripStop"
  ADD COLUMN "reachedAt" TIMESTAMPTZ(3);
ALTER TABLE "Reservation"
  ADD COLUMN "noShowAt" TIMESTAMPTZ(3),
  ADD CONSTRAINT "Reservation_boarded_or_absent"
    CHECK ("boardedAt" IS NULL OR "noShowAt" IS NULL);
