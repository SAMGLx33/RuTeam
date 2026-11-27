ALTER TYPE "TripStatus" ADD VALUE 'INTERRUMPIDO';
CREATE TYPE "CancellationReason" AS ENUM (
  'DRIVER_UNAVAILABLE', 'VEHICLE_ISSUE', 'SAFETY', 'CHANGE_OF_PLANS', 'ACCOUNT_CLOSED', 'OTHER'
);
ALTER TABLE "Trip" ADD COLUMN "terminationReason" "CancellationReason";
ALTER TABLE "Reservation" ADD COLUMN "withdrawalReason" "CancellationReason";
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_interruption_has_context" CHECK (
  ("status"::text <> 'INTERRUMPIDO' OR ("startedAt" IS NOT NULL AND "finishedAt" IS NOT NULL AND "terminationReason" IS NOT NULL)) AND
  ("terminationReason" IS NULL OR "status"::text IN ('CANCELADO','INTERRUMPIDO'))
);
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_withdrawal_has_context"
  CHECK ("withdrawalReason" IS NULL OR "status"::text = 'CANCELLED');

ALTER TYPE "TripIncidentKind" ADD VALUE 'TRIP_PROBLEM';
ALTER TYPE "TripIncidentKind" ADD VALUE 'TERMS';
ALTER TYPE "TripIncidentKind" ADD VALUE 'VEHICLE';
ALTER TYPE "TripIncidentKind" ADD VALUE 'ECONOMIC';
ALTER TYPE "TripIncidentKind" ADD VALUE 'TECHNICAL';
CREATE INDEX "TripIncident_reporterId_createdAt_id_idx" ON "TripIncident" ("reporterId","createdAt","id");
