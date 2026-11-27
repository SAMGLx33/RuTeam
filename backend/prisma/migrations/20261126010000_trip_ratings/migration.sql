CREATE TYPE "RatingCapacity" AS ENUM ('DRIVER', 'PASSENGER');

CREATE TABLE "TripRating" (
  "id" UUID NOT NULL,
  "tripId" UUID NOT NULL,
  "raterId" UUID NOT NULL,
  "rateeId" UUID NOT NULL,
  "capacity" "RatingCapacity" NOT NULL,
  "stars" SMALLINT NOT NULL,
  "comment" VARCHAR(500),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TripRating_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TripRating_stars_range" CHECK ("stars" BETWEEN 1 AND 5),
  CONSTRAINT "TripRating_distinct_people" CHECK ("raterId" <> "rateeId"),
  CONSTRAINT "TripRating_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TripRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TripRating_rateeId_fkey" FOREIGN KEY ("rateeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TripRating_tripId_raterId_rateeId_key" ON "TripRating" ("tripId", "raterId", "rateeId");
CREATE INDEX "TripRating_rateeId_capacity_idx" ON "TripRating" ("rateeId", "capacity");
CREATE INDEX "TripRating_raterId_idx" ON "TripRating" ("raterId");

ALTER TABLE "TripNotification"
  DROP CONSTRAINT "TripNotification_match_or_message_valid",
  ADD CONSTRAINT "TripNotification_kind_match_type_valid"
    CHECK (("kind" = 'TRIP_MATCH' AND "matchType" IS NOT NULL)
        OR ("kind" IN ('CHAT_MESSAGE', 'RATING_AVAILABLE', 'GROUP_CONFIRMED') AND "matchType" IS NULL));
