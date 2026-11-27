ALTER TABLE "TripDriverPosition"
  ADD COLUMN "accuracyMeters" DECIMAL(12, 3),
  ADD CONSTRAINT "TripDriverPosition_accuracy_nonnegative"
    CHECK ("accuracyMeters" >= 0);

ALTER TABLE "Trip"
  ADD COLUMN "trackingRevokedThroughAt" TIMESTAMPTZ(3);
