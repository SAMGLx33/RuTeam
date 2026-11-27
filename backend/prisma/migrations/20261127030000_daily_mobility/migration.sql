CREATE TABLE "SavedTrip" (
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "tripId" UUID NOT NULL REFERENCES "Trip"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "alertRequestedAt" TIMESTAMPTZ(3),
  CONSTRAINT "SavedTrip_pkey" PRIMARY KEY ("userId", "tripId")
);
CREATE INDEX "SavedTrip_tripId_idx" ON "SavedTrip"("tripId");
CREATE INDEX "SavedTrip_pending_alert_idx" ON "SavedTrip"("alertRequestedAt", "tripId", "userId")
  WHERE "alertRequestedAt" IS NOT NULL;

CREATE TABLE "FrequentPlace" (
  id UUID NOT NULL,
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  name VARCHAR(80) NOT NULL,
  "placeLabel" VARCHAR(160) NOT NULL,
  kind VARCHAR(24) NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "FrequentPlace_pkey" PRIMARY KEY (id),
  CHECK (kind IN ('HOME_AREA', 'PICKUP', 'DROPOFF', 'PUBLIC_REFERENCE', 'FAVORITE')),
  CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);
CREATE INDEX "FrequentPlace_userId_createdAt_idx" ON "FrequentPlace"("userId", "createdAt");

ALTER TABLE "MobilityPreference" ADD COLUMN "maxContributionCop" INT;
ALTER TABLE "MobilityPreference" ADD CONSTRAINT "MobilityPreference_max_contribution_valid"
  CHECK ("maxContributionCop" >= 0);

ALTER TABLE "TripNotification" DROP CONSTRAINT "TripNotification_kind_match_type_valid",
  ADD CONSTRAINT "TripNotification_kind_match_type_valid" CHECK (
    ("tripId" IS NOT NULL AND "kind" = 'TRIP_MATCH' AND "matchType" IS NOT NULL) OR
    ("tripId" IS NOT NULL AND "matchType" IS NULL AND "kind" IN (
      'CHAT_MESSAGE', 'RATING_AVAILABLE', 'GROUP_CONFIRMED',
      'PARTICIPATION_CONFIRMED', 'PASSENGER_JOINED', 'PASSENGER_WITHDREW',
      'PICKUP_PROPOSED', 'PICKUP_ACCEPTED', 'PICKUP_REJECTED', 'TRIP_CANCELLED',
      'TRIP_STARTED', 'PICKUP_NEXT', 'TRIP_FINISHED', 'COMPENSATION_DECLARED',
      'COMPENSATION_ACKNOWLEDGED', 'COMPENSATION_DISPUTED', 'OCCURRENCE_PUBLISHED',
      'TRIP_INTERRUPTED', 'INCIDENT_RECORDED', 'DESTINATION_REACHED',
      'TRIP_DELAYED', 'TRIP_EXPIRED', 'TRIP_EDITED', 'SEAT_AVAILABLE',
      'TRIP_DEPARTURE_REMINDER', 'TRIP_PICKUP_REMINDER', 'PICKUP_CONFIRMATION_REMINDER'
    )) OR
    ("tripId" IS NULL AND "matchType" IS NULL AND "eventKey" <> '' AND "kind" IN (
      'RECURRENCE_PAUSED', 'OCCURRENCE_FAILED', 'ACCOUNT_REACTIVATED',
      'ELIGIBILITY_CHANGED', 'DRIVING_DOCUMENT_REMINDER'
    ))
  );

CREATE INDEX "Trip_daily_reminder_time_idx"
  ON "Trip" ((COALESCE("startedAt", "estimatedDepartureAt", "departureAt")))
  WHERE status IN ('PROGRAMADO', 'EN_CURSO') AND "expiredAt" IS NULL;
