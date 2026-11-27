import { Injectable } from '@nestjs/common';
import type { MobilityTotals } from '@ruteam/contracts';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';

type Row = MobilityTotals & { period: string | null };

@Injectable()
export class MobilityStatisticsRepository {
  constructor(private readonly db: PrismaService) {}

  summary(actorId: string, months: number) {
    return this.db.$queryRaw<Row[]>`
      WITH actual AS (
        SELECT t.id, timezone('America/Bogota', COALESCE(t."finishedAt", t."departureAt")) AS at,
               t."driverId", t."routeDistanceMeters", t."environmentSnapshot"
        FROM "Trip" t
        WHERE t.status = 'COMPLETADO'
          AND COALESCE(t."finishedAt", t."departureAt") >=
              (date_trunc('month', timezone('America/Bogota', now())) -
               make_interval(months => ${months}::int - 1)) AT TIME ZONE 'America/Bogota'
      ), journeys AS (
        SELECT to_char(t.at, 'YYYY-MM') AS period, TRUE AS driver, t."routeDistanceMeters" AS meters,
               travelers.amount AS transported, travelers.amount > 0 AS shared
        FROM actual t
        CROSS JOIN LATERAL (
          SELECT count(*)::int AS amount FROM "Reservation" r
          JOIN "ReservationMember" m ON m."reservationId" = r.id
          WHERE r."tripId" = t.id AND r.status = 'CONFIRMED' AND
                r."boardedAt" IS NOT NULL AND r."noShowAt" IS NULL
        ) travelers
        WHERE t."driverId" = ${actorId}::uuid
        UNION ALL
        SELECT to_char(t.at, 'YYYY-MM'), FALSE,
               COALESCE((SELECT (rider->>'distanceMeters')::float8
                 FROM jsonb_array_elements(t."environmentSnapshot"->'riders') AS rider
                 WHERE rider->>'userId' = ${actorId}::text LIMIT 1), CASE WHEN pickup.position = 0 AND NOT EXISTS (
                 SELECT 1 FROM "TripStop" later WHERE later."tripId" = t.id AND later.position > dropoff.position
               ) THEN t."routeDistanceMeters" END),
               0, TRUE
        FROM "ReservationMember" m
        JOIN "Reservation" r ON r.id = m."reservationId"
        JOIN actual t ON t.id = r."tripId"
        JOIN "TripStop" pickup ON pickup.id = r."pickupId"
        JOIN "TripStop" dropoff ON dropoff.id = r."dropoffId"
        WHERE m."userId" = ${actorId}::uuid AND r.status = 'CONFIRMED' AND
              r."boardedAt" IS NOT NULL AND r."noShowAt" IS NULL
      )
      SELECT period,
             (count(*) FILTER (WHERE driver))::int AS "driverTrips",
             (count(*) FILTER (WHERE NOT driver))::int AS "passengerTrips",
             (count(*) FILTER (WHERE shared))::int AS "sharedTrips",
             COALESCE(sum(transported), 0)::int AS "transportedParticipants",
             (sum(meters) FILTER (WHERE driver))::float8 AS "driverDistanceMeters",
             (count(meters) FILTER (WHERE driver))::int AS "driverTripsWithDistance",
             (sum(meters) FILTER (WHERE NOT driver))::float8 AS "passengerDistanceMeters",
             (count(meters) FILTER (WHERE NOT driver))::int AS "passengerTripsWithDistance"
      FROM journeys GROUP BY GROUPING SETS ((period), ())
      ORDER BY period DESC NULLS FIRST
    `;
  }
}
