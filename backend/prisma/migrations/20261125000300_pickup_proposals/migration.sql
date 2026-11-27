CREATE TYPE "PickupProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE "PickupProposal" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "instructions" VARCHAR(240),
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "status" "PickupProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),
    "acceptedStopId" UUID,
    CONSTRAINT "PickupProposal_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PickupProposal_coordinates" CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180),
    CONSTRAINT "PickupProposal_decision" CHECK (
        ("status" = 'PENDING' AND "decidedAt" IS NULL AND "acceptedStopId" IS NULL)
        OR ("status" = 'REJECTED' AND "decidedAt" IS NOT NULL AND "acceptedStopId" IS NULL)
        OR ("status" = 'ACCEPTED' AND "decidedAt" IS NOT NULL AND "acceptedStopId" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "PickupProposal_tripId_acceptedStopId_key" ON "PickupProposal"("tripId", "acceptedStopId");
CREATE UNIQUE INDEX "PickupProposal_one_pending_per_student" ON "PickupProposal"("tripId", "requesterId") WHERE "status" = 'PENDING';
CREATE INDEX "PickupProposal_tripId_status_createdAt_idx" ON "PickupProposal"("tripId", "status", "createdAt");
CREATE INDEX "PickupProposal_requesterId_idx" ON "PickupProposal"("requesterId");

ALTER TABLE "PickupProposal" ADD CONSTRAINT "PickupProposal_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickupProposal" ADD CONSTRAINT "PickupProposal_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PickupProposal" ADD CONSTRAINT "PickupProposal_tripId_acceptedStopId_fkey"
  FOREIGN KEY ("tripId", "acceptedStopId") REFERENCES "TripStop"("tripId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
