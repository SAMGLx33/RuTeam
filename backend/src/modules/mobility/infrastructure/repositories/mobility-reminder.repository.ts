import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class MobilityReminderRepository {
  constructor(private readonly db: PrismaService) {}

  deliverDue(now: Date) {
    // Sources retain the due times. The inbox identity is the persistent delivery receipt.
    // One statement observes cancellation, preferences and eligibility on the same database snapshot.
    const upper = new Date(+now + 60 * 60_000);
    const lower = new Date(+now - 360 * 60_000);
    return this.db.$executeRaw`
      WITH upcoming AS (
        SELECT t.id, t."driverId", t."offeredSeats", t."occupiedSeats", t."departureAt", t.status,
          COALESCE(t."startedAt", t."estimatedDepartureAt", t."departureAt") AS departure
        FROM "Trip" t
        JOIN "User" driver ON driver.id=t."driverId"
        JOIN "InstitutionalMembership" membership ON membership."userId"=driver.id
        WHERE t.status IN ('PROGRAMADO','EN_CURSO') AND t."expiredAt" IS NULL
          AND COALESCE(t."startedAt", t."estimatedDepartureAt", t."departureAt") BETWEEN ${lower} AND ${upper}
          AND driver."disabledAt" IS NULL AND driver."emailVerifiedAt" IS NOT NULL
          AND driver."demoIdentity" IS NOT NULL AND membership.status='ACTIVE'
          AND membership."group"='STUDENT' AND membership."verifiedBy"='DEMO'
          AND membership."validUntil">${now}
      ), source AS (
        SELECT "driverId" AS recipient, id AS trip, 'TRIP_DEPARTURE_REMINDER' AS kind,
          '' AS key, departure AS event_at FROM upcoming WHERE status='PROGRAMADO'
        UNION ALL
        SELECT m."userId", t.id, 'TRIP_PICKUP_REMINDER', r.id::text,
          t.departure + make_interval(secs => COALESCE(p."estimatedOffsetSeconds", 0))
        FROM upcoming t JOIN "Reservation" r ON r."tripId"=t.id AND r.status='CONFIRMED' AND r."noShowAt" IS NULL AND r."boardedAt" IS NULL
        JOIN "ReservationMember" m ON m."reservationId"=r.id
        JOIN "TripStop" p ON p.id=r."pickupId" AND p."reachedAt" IS NULL
          AND (p.position=0 OR p."estimatedOffsetSeconds" IS NOT NULL)
        UNION ALL
        SELECT p."requesterId", t.id, 'PICKUP_CONFIRMATION_REMINDER', p.id::text,
          LEAST(t.departure + make_interval(secs => COALESCE(s."estimatedOffsetSeconds", 0)), t."departureAt")
        FROM upcoming t JOIN "PickupProposal" p ON p."tripId"=t.id AND p.status='ACCEPTED'
        JOIN "TripStop" s ON s.id=p."acceptedStopId"
        WHERE t.status='PROGRAMADO' AND t."offeredSeats">t."occupiedSeats" AND NOT EXISTS (
          SELECT 1 FROM "Reservation" r JOIN "ReservationMember" m ON m."reservationId"=r.id
          WHERE r."tripId"=t.id AND r.status='CONFIRMED' AND m."userId"=p."requesterId"
        )
        UNION ALL
        SELECT l."userId", NULL::uuid, 'DRIVING_DOCUMENT_REMINDER', 'license', l."expiresAt"
        FROM "DriverEligibility" l WHERE l."expiresAt" BETWEEN ${now} AND ${upper}
        UNION ALL
        SELECT v."ownerId", NULL::uuid, 'DRIVING_DOCUMENT_REMINDER', d.id::text, d."expiresAt"
        FROM "VehicleDocument" d JOIN "Vehicle" v ON v.id=d."vehicleId"
        WHERE d."expiresAt" BETWEEN ${now} AND ${upper}
      ), eligible AS (
        SELECT s.recipient, s.trip, s.kind, concat(s.key, ':', EXTRACT(EPOCH FROM s.event_at)) AS key, s.event_at
        FROM source s JOIN "User" u ON u.id=s.recipient
        JOIN "InstitutionalMembership" m ON m."userId"=u.id
        WHERE u."disabledAt" IS NULL AND u."emailVerifiedAt" IS NOT NULL AND u."demoIdentity" IS NOT NULL
          AND m.status='ACTIVE' AND m."group"='STUDENT' AND m."verifiedBy"='DEMO' AND m."validUntil">${now}
          AND u."notificationPreferences"->'reminders' IS DISTINCT FROM 'false'::jsonb
          AND s.event_at>${now} AND s.event_at<=${now}::timestamptz + make_interval(mins => CASE u."notificationPreferences"->'reminderLeadMinutes'
            WHEN '15'::jsonb THEN 15 WHEN '60'::jsonb THEN 60 ELSE 30 END)
      )
      INSERT INTO "TripNotification"(id, "recipientId", "tripId", kind, "eventKey")
      SELECT gen_random_uuid(), e.recipient, e.trip, e.kind, e.key FROM eligible e
      WHERE NOT EXISTS (
        SELECT 1 FROM "TripNotification" n WHERE n."recipientId"=e.recipient AND n."tripId" IS NOT DISTINCT FROM e.trip
          AND n.kind=e.kind AND n."eventKey"=e.key
      )
      ORDER BY e.event_at, e.recipient, e.key LIMIT 100
      ON CONFLICT DO NOTHING
    `;
  }
}
