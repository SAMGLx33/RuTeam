CREATE TYPE "CompensationMethod" AS ENUM ('NEQUI', 'DAVIPLATA', 'CASH');
CREATE TYPE "CompensationStatus" AS ENUM ('DECLARED', 'ACKNOWLEDGED', 'DISPUTED', 'CANCELLED');
CREATE TYPE "TripIncidentKind" AS ENUM ('ROAD_SAFETY', 'CONDUCT', 'OTHER');

ALTER TABLE "Trip"
  ADD COLUMN "suggestedContributionCop" INTEGER,
  ADD COLUMN "compensationMethods" "CompensationMethod"[] NOT NULL DEFAULT '{}',
  ADD COLUMN "trackingSharedAt" TIMESTAMPTZ(3),
  ADD CONSTRAINT "Trip_compensation_terms_ck" CHECK (
    (COALESCE("suggestedContributionCop", 0) = 0 AND cardinality("compensationMethods") = 0) OR
    ("suggestedContributionCop" IS NOT NULL AND "suggestedContributionCop" BETWEEN 1 AND 150000000 AND
      cardinality("compensationMethods") BETWEEN 1 AND 2 AND
      array_position("compensationMethods", NULL) IS NULL AND
      (cardinality("compensationMethods") = 1 OR "compensationMethods"[1] <> "compensationMethods"[2]))
  );

UPDATE "Trip" t SET "trackingSharedAt" = p."sharedAt"
FROM "TripDriverPosition" p WHERE p."tripId" = t.id AND t.status = 'EN_CURSO';

CREATE TABLE "TripCompensation" (
  "reservationId" UUID PRIMARY KEY REFERENCES "Reservation"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  "method" "CompensationMethod" NOT NULL,
  "amountCop" INTEGER NOT NULL CHECK ("amountCop" BETWEEN 1 AND 150000000),
  "status" "CompensationStatus" NOT NULL DEFAULT 'DECLARED',
  "declaredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMPTZ(3),
  CHECK (("status" = 'DECLARED') = ("resolvedAt" IS NULL))
);

CREATE TABLE "EmergencyContact" (
  "id" UUID PRIMARY KEY,
  "ownerId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "name" VARCHAR(80) NOT NULL CHECK (length(btrim("name")) > 0),
  "phone" VARCHAR(16) NOT NULL CHECK ("phone" ~ '^[+]?[0-9]{7,15}$'),
  "relationship" VARCHAR(40),
  "available" BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX "EmergencyContact_ownerId_id_idx" ON "EmergencyContact"("ownerId", id);

CREATE TABLE "TripIncident" (
  "id" UUID PRIMARY KEY,
  "tripId" UUID NOT NULL REFERENCES "Trip"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  "reporterId" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  "kind" "TripIncidentKind" NOT NULL,
  "description" VARCHAR(1000) NOT NULL CHECK (length(btrim("description")) >= 5),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "TripIncident_reporterId_tripId_createdAt_idx" ON "TripIncident"("reporterId", "tripId", "createdAt");

ALTER TABLE "TripNotification" ADD COLUMN "eventKey" VARCHAR(40) NOT NULL DEFAULT '';
DROP INDEX "TripNotification_recipientId_tripId_kind_key";
CREATE UNIQUE INDEX "TripNotification_event_key" ON "TripNotification"("recipientId", "tripId", "kind", "eventKey");

ALTER TYPE "PickupProposalStatus" ADD VALUE 'EXPIRED' BEFORE 'PENDING';
