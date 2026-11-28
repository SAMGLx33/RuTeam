import { Inject } from '@nestjs/common';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { CreateTripGroupInput } from '@ruteam/contracts';
import {
  checkDriver,
  checkMembers,
  checkOpen,
  type BookableTrip,
} from '../../reservations/application/participation-eligibility.js';
import { ReservationsRepository } from '../../reservations/infrastructure/repositories/reservations.repository.js';
import { allowsSegment } from '../../trips/domain/models/driver-route.js';
import { presentStops } from '../../trips/infrastructure/repositories/trips.repository.js';
import { groupStatus, invitationExpiresAt } from '../domain/group-state.js';
import {
  groupPreview,
  groupsInTrip,
  groupView,
  GroupsRepository,
  type Group,
} from '../infrastructure/repositories/groups.repository.js';

function codeHash(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

function activeInvitation(group: Group, now: Date) {
  if (groupStatus(group, now) !== 'OPEN')
    throw new ConflictException('La invitación ya no está abierta');
}

function checkSegment(trip: BookableTrip, pickupId: string, dropoffId: string) {
  if (!allowsSegment(presentStops(trip), pickupId, dropoffId))
    throw new BadRequestException(
      'Selecciona una recogida y un descenso autorizados',
    );
}

function requireGroup(group: Group | null): Group {
  if (!group) throw new NotFoundException('Grupo inexistente');
  return group;
}

@Injectable()
export class GroupsService {
  constructor(
    @Inject(ENVIRONMENT) private readonly env: Environment,
    private readonly repository: GroupsRepository,
    private readonly reservations: ReservationsRepository,
  ) {}

  create(actorId: string, tripId: string, input: CreateTripGroupInput) {
    return this.reservations.withTripLock(tripId, async (unit, tx) => {
      const groups = groupsInTrip(tx, tripId);
      const trip = await unit.trip();
      const now = new Date();
      if (trip.driverId === actorId)
        throw new ForbiddenException(
          'El conductor no puede participar en su propio viaje',
        );
      checkOpen(trip, now);
      checkDriver(trip, now, this.env);
      await checkMembers(unit, [actorId], now);
      const pickupId = input.pickupId.toLowerCase();
      const dropoffId = input.dropoffId.toLowerCase();
      checkSegment(trip, pickupId, dropoffId);
      if (input.expectedMembers > trip.offeredSeats)
        throw new ConflictException('El grupo supera las plazas ofrecidas');
      if (
        (await unit.activeForMember(actorId)) ||
        (await groups.openConsent(actorId, now))
      )
        throw new ConflictException(
          'Ya tienes una participación o un grupo abierto en este viaje',
        );
      const invitationCode = randomBytes(32).toString('base64url');
      const row = await groups.create({
        organizerId: actorId,
        pickupId,
        dropoffId,
        expectedMembers: input.expectedMembers,
        inviteHash: codeHash(invitationCode),
        createdAt: now,
        expiresAt: invitationExpiresAt(now, trip.departureAt),
      });
      return { group: groupView(row, actorId, now), invitationCode };
    });
  }

  async preview(code: string) {
    const group = await this.invitation(code);
    activeInvitation(group, new Date());
    return groupPreview(group);
  }

  async join(actorId: string, code: string) {
    const proposed = await this.invitation(code);
    return this.reservations.withTripLock(proposed.tripId, async (unit, tx) => {
      const groups = groupsInTrip(tx, proposed.tripId);
      const group = requireGroup(await groups.group(proposed.id));
      if (group.inviteHash !== codeHash(code))
        throw new NotFoundException('Invitación inexistente');
      const now = new Date();
      activeInvitation(group, now);
      const trip = await unit.trip();
      if (trip.driverId === actorId)
        throw new ForbiddenException(
          'El conductor no puede participar en su propio viaje',
        );
      checkOpen(trip, now);
      checkDriver(trip, now, this.env);
      await checkMembers(unit, [actorId], now);
      if (group.members.some(({ userId }) => userId === actorId))
        return groupView(group, actorId, now);
      if (group.members.length >= group.expectedMembers)
        throw new ConflictException(
          'El grupo ya tiene todos sus consentimientos',
        );
      if (
        (await unit.activeForMember(actorId)) ||
        (await groups.openConsent(actorId, now))
      )
        throw new ConflictException(
          'Ya tienes una participación o un grupo abierto en este viaje',
        );
      await groups.consent(group.id, actorId, now);
      return groupView(
        requireGroup(await groups.group(group.id)),
        actorId,
        now,
      );
    });
  }

  async rotate(actorId: string, groupId: string) {
    const { tripId } = await this.locate(groupId);
    return this.reservations.withTripLock(tripId, async (_unit, tx) => {
      const groups = groupsInTrip(tx, tripId);
      const group = requireGroup(await groups.group(groupId));
      if (group.organizerId !== actorId)
        throw new ForbiddenException(
          'Sólo el organizador puede renovar el código',
        );
      const now = new Date();
      activeInvitation(group, now);
      const invitationCode = randomBytes(32).toString('base64url');
      const row = await groups.changeInvitation(
        groupId,
        codeHash(invitationCode),
      );
      return { group: groupView(row, actorId, now), invitationCode };
    });
  }

  async confirm(actorId: string, groupId: string) {
    const { tripId } = await this.locate(groupId);
    return this.reservations.withTripLock(
      tripId,
      async (unit, tx) => {
        const groups = groupsInTrip(tx, tripId);
        const group = requireGroup(await groups.group(groupId));
        if (group.organizerId !== actorId)
          throw new ForbiddenException(
            'Sólo el organizador puede confirmar el grupo',
          );
        const now = new Date();
        if (group.confirmedAt) return groupView(group, actorId, now);
        activeInvitation(group, now);
        const trip = await unit.trip();
        checkOpen(trip, now);
        checkDriver(trip, now, this.env);
        checkSegment(trip, group.pickupId, group.dropoffId);
        const ids = group.members.map(({ userId }) => userId);
        if (ids.length !== group.expectedMembers || !ids.includes(actorId))
          throw new ConflictException(
            'Aún faltan consentimientos para confirmar el grupo',
          );
        await groups.lockMemberships(ids);
        await checkMembers(unit, ids, now);
        for (const id of ids) {
          if (id === trip.driverId || (await unit.activeForMember(id)))
            throw new ConflictException(
              'Un integrante ya participa en el viaje',
            );
          if (await unit.conflictFor(id, trip, group.pickupId, group.dropoffId))
            throw new ConflictException(
              'Hay un conflicto de horario dentro del grupo',
            );
        }
        if (trip.offeredSeats - trip.occupiedSeats < ids.length)
          throw new ConflictException('No hay plazas para todo el grupo');
        await unit.addOccupiedSeats(ids.length);
        for (const id of ids) {
          const row = await unit.create(
            id,
            group.pickupId,
            group.dropoffId,
            now,
          );
          await groups.attachReservation(groupId, id, row.id);
        }
        return groupView(await groups.confirm(groupId, now, ids), actorId, now);
      },
      true,
    );
  }

  async leave(actorId: string, groupId: string) {
    const { tripId } = await this.locate(groupId);
    return this.reservations.withTripLock(tripId, async (_unit, tx) => {
      const groups = groupsInTrip(tx, tripId);
      const group = requireGroup(await groups.group(groupId));
      if (!group.members.some(({ userId }) => userId === actorId))
        throw new ForbiddenException(
          'Sólo un integrante puede retirar su consentimiento',
        );
      const now = new Date();
      if (group.confirmedAt)
        throw new ConflictException(
          'Para retirarte usa tu participación individual',
        );
      activeInvitation(group, now);
      if (group.organizerId === actorId)
        return groupView(await groups.revoke(groupId, now), actorId, now);
      await groups.withdraw(groupId, actorId, now);
      return groupView(requireGroup(await groups.group(groupId)), actorId, now);
    });
  }

  async mine(actorId: string) {
    const now = new Date();
    return (await this.repository.mine(actorId)).map((row) =>
      groupView(row, actorId, now),
    );
  }

  private async invitation(code: string) {
    const group = await this.repository.byCode(codeHash(code));
    if (!group) throw new NotFoundException('Invitación inexistente');
    return group;
  }

  private async locate(id: string) {
    const group = await this.repository.tripForGroup(id);
    if (!group) throw new NotFoundException('Grupo inexistente');
    return group;
  }
}
