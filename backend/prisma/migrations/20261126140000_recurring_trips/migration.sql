CREATE TYPE "RecurringTripState" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

CREATE TABLE "RecurringTrip" (
  "id" UUID PRIMARY KEY,
  "driverId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "name" VARCHAR(80) NOT NULL,
  "startsOn" DATE NOT NULL,
  "endsOn" DATE NOT NULL,
  "time" VARCHAR(5) NOT NULL CHECK ("time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  "weekdays" INTEGER[] NOT NULL CHECK (
    cardinality("weekdays") BETWEEN 1 AND 7 AND
    "weekdays" <@ ARRAY[1,2,3,4,5,6,7] AND array_position("weekdays", NULL) IS NULL
  ),
  "template" JSONB NOT NULL CHECK (jsonb_typeof("template") = 'object'),
  "routeSnapshot" JSONB NOT NULL CHECK (jsonb_typeof("routeSnapshot") = 'object'),
  "state" "RecurringTripState" NOT NULL DEFAULT 'ACTIVE',
  "nextScanAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CHECK ("endsOn" BETWEEN "startsOn" AND "startsOn" + 365)
);
CREATE INDEX "RecurringTrip_state_nextScanAt_idx" ON "RecurringTrip" ("state","nextScanAt");
CREATE INDEX "RecurringTrip_driverId_updatedAt_idx" ON "RecurringTrip" ("driverId","updatedAt");

CREATE TABLE "RecurringOccurrence" (
  "scheduleId" UUID NOT NULL REFERENCES "RecurringTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "date" DATE NOT NULL,
  "departureAt" TIMESTAMPTZ(3) NOT NULL,
  "tripId" UUID UNIQUE REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "failure" VARCHAR(240),
  CONSTRAINT "RecurringOccurrence_pkey" PRIMARY KEY ("scheduleId","date"),
  CHECK (("tripId" IS NULL) <> ("failure" IS NULL))
);

ALTER TABLE "TripNotification" ALTER COLUMN "tripId" DROP NOT NULL,
  ALTER COLUMN "eventKey" TYPE VARCHAR(80),
  DROP CONSTRAINT "TripNotification_kind_match_type_valid",
  ADD CONSTRAINT "TripNotification_kind_match_type_valid" CHECK (
    ("tripId" IS NOT NULL AND "kind" = 'TRIP_MATCH' AND "matchType" IS NOT NULL) OR
    ("tripId" IS NOT NULL AND "matchType" IS NULL AND "kind" IN (
      'CHAT_MESSAGE', 'RATING_AVAILABLE', 'GROUP_CONFIRMED',
      'PARTICIPATION_CONFIRMED', 'PASSENGER_JOINED', 'PASSENGER_WITHDREW',
      'PICKUP_PROPOSED', 'PICKUP_ACCEPTED', 'PICKUP_REJECTED', 'TRIP_CANCELLED',
      'TRIP_STARTED', 'PICKUP_NEXT', 'TRIP_FINISHED', 'COMPENSATION_DECLARED',
      'COMPENSATION_ACKNOWLEDGED', 'COMPENSATION_DISPUTED', 'OCCURRENCE_PUBLISHED',
      'TRIP_INTERRUPTED', 'INCIDENT_RECORDED'
    )) OR
    ("tripId" IS NULL AND "matchType" IS NULL AND "eventKey" <> '' AND
     "kind" IN ('RECURRENCE_PAUSED', 'OCCURRENCE_FAILED', 'ACCOUNT_REACTIVATED', 'ELIGIBILITY_CHANGED'))
  );
CREATE UNIQUE INDEX "TripNotification_inbox_event_key"
  ON "TripNotification" ("recipientId", "kind", "eventKey") WHERE "tripId" IS NULL;
