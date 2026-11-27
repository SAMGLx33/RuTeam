ALTER TABLE "PickupProposal"
  DROP CONSTRAINT "PickupProposal_decision",
  ADD CONSTRAINT "PickupProposal_decision" CHECK (
    ("status" = 'PENDING' AND "decidedAt" IS NULL AND "acceptedStopId" IS NULL)
    OR ("status" = 'REJECTED' AND "decidedAt" IS NOT NULL AND "acceptedStopId" IS NULL)
    OR ("status" = 'ACCEPTED' AND "decidedAt" IS NOT NULL AND "acceptedStopId" IS NOT NULL)
    OR ("status" = 'EXPIRED' AND "acceptedStopId" IS NULL)
  );

UPDATE "PickupProposal" p SET "status" = 'EXPIRED'
FROM "Trip" t WHERE p."tripId" = t.id
  AND p."status" = 'PENDING'
  AND t."status" <> 'PROGRAMADO';

DELETE FROM "ReservationBoardingPass" p
USING "Reservation" r, "Trip" t
WHERE p."reservationId" = r.id AND r."tripId" = t.id
  AND (t."status" IN ('CANCELADO', 'COMPLETADO')
       OR r."status" <> 'CONFIRMED' OR r."noShowAt" IS NOT NULL);
