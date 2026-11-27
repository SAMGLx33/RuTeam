import { Injectable } from '@nestjs/common';
import type {
  EmergencyContactInput,
  TripIncidentInput,
} from '@ruteam/contracts';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { recordTripNotice } from '../../../mobility/infrastructure/trip-notices.js';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { ReservationsRepository } from '../../../reservations/infrastructure/repositories/reservations.repository.js';

const contactSelect = {
  id: true,
  name: true,
  phone: true,
  relationship: true,
  available: true,
} as const;
const incidentSelect = {
  id: true,
  kind: true,
  description: true,
  createdAt: true,
} as const;

const incidentTrip = {
  id: true,
  status: true,
  departureAt: true,
  originLabel: true,
} as const;
const personalIncident = {
  ...incidentSelect,
  trip: { select: incidentTrip },
} as const;

function incidentAccess(actorId: string): Prisma.TripWhereInput {
  const membership = {
    status: 'CONFIRMED' as const,
    noShowAt: null,
    members: { some: { userId: actorId } },
  };
  const closed = ['COMPLETADO', 'INTERRUMPIDO'] as const;
  return {
    OR: [
      { driverId: actorId, status: { in: ['EN_CURSO', ...closed] } },
      { status: 'EN_CURSO', reservations: { some: membership } },
      {
        status: { in: [...closed] },
        reservations: { some: { ...membership, boardedAt: { not: null } } },
      },
    ],
  };
}

@Injectable()
export class PrivateSafetyRepository {
  constructor(
    private readonly db: PrismaService,
    private readonly reservations: ReservationsRepository,
  ) {}

  contacts(ownerId: string) {
    return this.db.emergencyContact.findMany({
      where: { ownerId },
      select: contactSelect,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  createContact(ownerId: string, input: EmergencyContactInput, limit: number) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${ownerId}::uuid FOR NO KEY UPDATE`;
      if ((await tx.emergencyContact.count({ where: { ownerId } })) >= limit)
        return null;
      return tx.emergencyContact.create({
        data: { ...input, ownerId },
        select: contactSelect,
      });
    });
  }

  async replaceContact(
    ownerId: string,
    id: string,
    input: EmergencyContactInput,
  ) {
    const [record] = await this.db.emergencyContact.updateManyAndReturn({
      where: { id, ownerId },
      data: { ...input, relationship: input.relationship ?? null },
      select: contactSelect,
    });
    return record;
  }

  async deleteContact(ownerId: string, id: string) {
    const { count } = await this.db.emergencyContact.deleteMany({
      where: { id, ownerId },
    });
    return count > 0;
  }

  incidentAccess(actorId: string, tripId: string) {
    return this.db.trip.findFirst({
      where: { id: tripId, ...incidentAccess(actorId) },
      select: { id: true },
    });
  }

  eligibleIncidentTrips(actorId: string, offset: number) {
    return this.db.trip.findMany({
      where: incidentAccess(actorId),
      select: incidentTrip,
      orderBy: [{ departureAt: 'desc' }, { id: 'asc' }],
      skip: offset,
      take: 21,
    });
  }

  personalIncidents(reporterId: string, offset: number) {
    return this.db.tripIncident.findMany({
      where: { reporterId },
      select: personalIncident,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: 21,
    });
  }

  personalIncident(reporterId: string, id: string) {
    return this.db.tripIncident.findFirst({
      where: { reporterId, id },
      select: personalIncident,
    });
  }

  incidents(reporterId: string, tripId: string) {
    return this.db.tripIncident.findMany({
      where: { reporterId, tripId },
      select: incidentSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });
  }

  withIncidentContext(
    reporterId: string,
    tripId: string,
    input: TripIncidentInput,
    permitted: (trip: {
      status: string;
      owned: boolean;
      confirmed: boolean;
      boarded: boolean;
    }) => boolean,
  ) {
    return this.reservations.withTripLock(tripId, async (unit, tx) => {
      const trip = await unit.trip();
      const reservation = await unit.activeForMember(reporterId);
      if (
        !permitted({
          status: trip.status,
          owned: trip.driverId === reporterId,
          confirmed: !!reservation && !reservation.noShowAt,
          boarded: !!reservation?.boardedAt && !reservation.noShowAt,
        })
      )
        return null;
      const record = await tx.tripIncident.create({
        data: { ...input, reporterId, tripId },
        select: incidentSelect,
      });
      await recordTripNotice(
        tx,
        tripId,
        'INCIDENT_RECORDED',
        [reporterId],
        record.id,
      );
      return record;
    });
  }
}
