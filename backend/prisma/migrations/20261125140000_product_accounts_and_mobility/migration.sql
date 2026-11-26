-- CreateEnum
CREATE TYPE "UsagePreference" AS ENUM ('PASSENGER', 'DRIVER_AND_PASSENGER');

-- CreateEnum
CREATE TYPE "AccountTokenPurpose" AS ENUM ('EMAIL_CONFIRMATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "MobilityDirection" AS ENUM ('DESDE_USC', 'HACIA_USC');

-- CreateEnum
CREATE TYPE "RecommendationJobState" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RecommendationMatchType" AS ENUM ('DIRECT', 'POTENTIAL');

-- AlterEnum
ALTER TYPE "MembershipStatus" ADD VALUE 'REVOKED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMPTZ(3),
ADD COLUMN     "onboardingCompletedAt" TIMESTAMPTZ(3),
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passwordHash" VARCHAR(255),
ADD COLUMN     "usagePreference" "UsagePreference";

-- CreateTable
CREATE TABLE "AccountToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "purpose" "AccountTokenPurpose" NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilityPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "campusPointId" UUID NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "direction" "MobilityDirection" NOT NULL,
    "days" INTEGER[],
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "placeLabel" VARCHAR(160) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "radiusKm" DECIMAL(5,3) NOT NULL,
    "vehicleTypes" "VehicleType"[],
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MobilityPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationJob" (
    "tripId" UUID NOT NULL,
    "state" "RecommendationJobState" NOT NULL DEFAULT 'PENDING',
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "cursor" UUID,

    CONSTRAINT "RecommendationJob_pkey" PRIMARY KEY ("tripId")
);

-- CreateTable
CREATE TABLE "TripNotification" (
    "id" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "kind" VARCHAR(32) NOT NULL DEFAULT 'TRIP_MATCH',
    "matchType" "RecommendationMatchType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMPTZ(3),

    CONSTRAINT "TripNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountToken_tokenHash_key" ON "AccountToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountToken_userId_purpose_createdAt_idx" ON "AccountToken"("userId", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "MobilityPreference_userId_active_id_idx" ON "MobilityPreference"("userId", "active", "id");

-- CreateIndex
CREATE INDEX "MobilityPreference_campusPointId_direction_active_notificat_idx" ON "MobilityPreference"("campusPointId", "direction", "active", "notificationsEnabled", "id");

-- CreateIndex
CREATE INDEX "RecommendationJob_state_availableAt_idx" ON "RecommendationJob"("state", "availableAt");

-- CreateIndex
CREATE INDEX "TripNotification_recipientId_createdAt_id_idx" ON "TripNotification"("recipientId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "TripNotification_tripId_idx" ON "TripNotification"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripNotification_recipientId_tripId_kind_key" ON "TripNotification"("recipientId", "tripId", "kind");

-- AddForeignKey
ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityPreference" ADD CONSTRAINT "MobilityPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityPreference" ADD CONSTRAINT "MobilityPreference_campusPointId_fkey" FOREIGN KEY ("campusPointId") REFERENCES "CampusDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationJob" ADD CONSTRAINT "RecommendationJob_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripNotification" ADD CONSTRAINT "TripNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripNotification" ADD CONSTRAINT "TripNotification_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Protect new invariants even when a workflow bypasses HTTP DTO validation.
ALTER TABLE "User"
  ADD CONSTRAINT "User_onboarding_progress_valid"
  CHECK ("onboardingStep" BETWEEN 0 AND 4 AND ("onboardingCompletedAt" IS NULL OR "onboardingStep" = 4));

ALTER TABLE "MobilityPreference"
  ADD CONSTRAINT "MobilityPreference_time_window_valid"
  CHECK ("startMinute" BETWEEN 0 AND 1439 AND "endMinute" BETWEEN "startMinute" AND 1439),
  ADD CONSTRAINT "MobilityPreference_match_inputs_valid"
  CHECK (
    "days" IS NOT NULL AND cardinality("days") BETWEEN 1 AND 7 AND "days" <@ ARRAY[1,2,3,4,5,6,7]
    AND "vehicleTypes" IS NOT NULL AND cardinality("vehicleTypes") BETWEEN 1 AND 2
    AND "radiusKm" > 0 AND "radiusKm" < 4
    AND ("latitude" IS NULL) = ("longitude" IS NULL)
    AND ("latitude" IS NULL OR ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180))
  );
