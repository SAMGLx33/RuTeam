import { Injectable } from '@nestjs/common';
import type { EconomicHistory, EconomicHistoryRole } from '@ruteam/contracts';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { EconomicHistoryDto } from '../dto/economic-history.dto.js';

const pageSize = 20;

function histories(actorId: string, role: EconomicHistoryRole) {
  if (role === 'DRIVER')
    return Prisma.sql`
    SELECT t.id AS "tripId", NULL::uuid AS "participationId", t."departureAt",
           NULL::text AS "participationStatus", t.status::text AS "tripStatus", t."originLabel" AS route,
           t."suggestedContributionCop" AS "suggestedCop",
           (e."fuelCop" + e."tollsCop" + e."parkingCop") AS "expenseCop",
           t.status = 'COMPLETADO' AS traveled, FALSE AS "canOpenCompensation",
           c.declared, c.acknowledged, c.disputed, c.cancelled,
           c."declaredCop", c."acknowledgedCop", c."disputedCop"
    FROM "Trip" t
    LEFT JOIN "TripExpenseEstimate" e ON e."tripId" = t.id
    CROSS JOIN LATERAL (
      SELECT count(*) FILTER (WHERE c.status = 'DECLARED')::int AS declared,
             count(*) FILTER (WHERE c.status = 'ACKNOWLEDGED')::int AS acknowledged,
             count(*) FILTER (WHERE c.status = 'DISPUTED')::int AS disputed,
             count(*) FILTER (WHERE c.status = 'CANCELLED')::int AS cancelled,
             COALESCE(sum(c."amountCop") FILTER (WHERE c.status = 'DECLARED'), 0)::float8 AS "declaredCop",
             COALESCE(sum(c."amountCop") FILTER (WHERE c.status = 'ACKNOWLEDGED'), 0)::float8 AS "acknowledgedCop",
             COALESCE(sum(c."amountCop") FILTER (WHERE c.status = 'DISPUTED'), 0)::float8 AS "disputedCop"
      FROM "Reservation" r JOIN "TripCompensation" c ON c."reservationId" = r.id
      WHERE r."tripId" = t.id
    ) c
    WHERE t."driverId" = ${actorId}::uuid
  `;
  return Prisma.sql`
    SELECT t.id AS "tripId", r.id AS "participationId", t."departureAt",
           CASE WHEN r."noShowAt" IS NOT NULL THEN 'NO_SHOW' ELSE r.status::text END AS "participationStatus",
           t.status::text AS "tripStatus", t."originLabel" AS route,
           t."suggestedContributionCop" AS "suggestedCop", NULL::int AS "expenseCop",
           (t.status = 'COMPLETADO' AND r.status = 'CONFIRMED' AND r."boardedAt" IS NOT NULL AND r."noShowAt" IS NULL) AS traveled,
           (r."requesterId" = ${actorId}::uuid AND r.quantity = 1 AND
            COALESCE(t."suggestedContributionCop", 0) > 0 AND
            t.status = 'COMPLETADO' AND r.status = 'CONFIRMED' AND r."boardedAt" IS NOT NULL AND r."noShowAt" IS NULL) AS "canOpenCompensation",
           COALESCE(c.status = 'DECLARED', FALSE)::int AS declared,
           COALESCE(c.status = 'ACKNOWLEDGED', FALSE)::int AS acknowledged,
           COALESCE(c.status = 'DISPUTED', FALSE)::int AS disputed,
           COALESCE(c.status = 'CANCELLED', FALSE)::int AS cancelled,
           CASE WHEN c.status = 'DECLARED' THEN c."amountCop" ELSE 0 END AS "declaredCop",
           CASE WHEN c.status = 'ACKNOWLEDGED' THEN c."amountCop" ELSE 0 END AS "acknowledgedCop",
           CASE WHEN c.status = 'DISPUTED' THEN c."amountCop" ELSE 0 END AS "disputedCop"
    FROM "ReservationMember" m
    JOIN "Reservation" r ON r.id = m."reservationId"
    JOIN "Trip" t ON t.id = r."tripId"
    LEFT JOIN "TripCompensation" c ON c."reservationId" = r.id AND r."requesterId" = ${actorId}::uuid
    WHERE m."userId" = ${actorId}::uuid
  `;
}

function filterByStatus(filter: EconomicHistoryDto['filter']) {
  switch (filter) {
    case 'FREE':
      return Prisma.sql`AND h."suggestedCop" = 0`;
    case 'SUGGESTED':
      return Prisma.sql`AND h."suggestedCop" > 0 AND h.declared + h.acknowledged + h.disputed + h.cancelled = 0`;
    case 'DECLARED':
      return Prisma.sql`AND h.declared > 0`;
    case 'ACKNOWLEDGED':
      return Prisma.sql`AND h.acknowledged > 0`;
    case 'DISPUTED':
      return Prisma.sql`AND h.disputed > 0`;
    case 'CANCELLED':
      return Prisma.sql`AND h.cancelled > 0`;
    default:
      return Prisma.empty;
  }
}

@Injectable()
export class EconomicHistoryRepository {
  constructor(private readonly db: PrismaService) {}

  async list(
    actorId: string,
    input: EconomicHistoryDto,
  ): Promise<EconomicHistory> {
    const role = input.role ?? 'PASSENGER';
    const offset = input.offset ?? 0;
    const [row] = await this.db.$queryRaw<
      Pick<EconomicHistory, 'totalEntries' | 'entries' | 'totals'>[]
    >`
      WITH histories AS (${histories(actorId, role)}),
      filtered AS (
        SELECT * FROM histories h WHERE TRUE
        ${input.month ? Prisma.sql`AND to_char(timezone('America/Bogota', h."departureAt"), 'YYYY-MM') = ${input.month}` : Prisma.empty}
        ${input.tripId ? Prisma.sql`AND h."tripId" = ${input.tripId}::uuid` : Prisma.empty}
        ${filterByStatus(input.filter)}
      ), page AS (
        SELECT * FROM filtered ORDER BY "departureAt" DESC, "tripId" ASC, "participationId" ASC
        LIMIT ${pageSize} OFFSET ${offset}
      )
      SELECT count(*)::int AS "totalEntries",
             jsonb_build_object(
               'expenseCop', COALESCE(sum("expenseCop"),0),
               'expenseTrips', count("expenseCop"),
               'suggestedForTraveledCop', CASE WHEN ${role}::text = 'PASSENGER'
                   THEN COALESCE(sum("suggestedCop") FILTER (WHERE traveled),0) ELSE 0 END,
               'declaredCop', COALESCE(sum("declaredCop"),0),
               'acknowledgedCop', COALESCE(sum("acknowledgedCop"),0),
               'disputedCop', COALESCE(sum("disputedCop"),0)
             ) AS totals,
             (SELECT COALESCE(jsonb_agg(
                to_jsonb(p) - ARRAY['declared','acknowledged','disputed','cancelled'] ||
                jsonb_build_object('records', jsonb_build_object(
                  'DECLARED', p.declared, 'ACKNOWLEDGED', p.acknowledged,
                  'DISPUTED', p.disputed, 'CANCELLED', p.cancelled
                )) ORDER BY p."departureAt" DESC, p."tripId", p."participationId"), '[]'::jsonb) FROM page p) AS entries
      FROM filtered
    `;
    return {
      ...row,
      role,
      nextOffset:
        offset + pageSize < row.totalEntries && offset + pageSize <= 10000
          ? offset + pageSize
          : null,
    };
  }
}
