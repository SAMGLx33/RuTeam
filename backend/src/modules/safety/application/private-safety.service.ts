import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  EmergencyContactInput,
  TripIncident,
  TripIncidentInput,
  PersonalIncidentsPage,
  IncidentExport,
} from '@ruteam/contracts';
import { PrivateSafetyRepository } from '../infrastructure/repositories/private-safety.repository.js';

function incidentView(row: {
  id: string;
  kind: TripIncident['kind'];
  description: string;
  createdAt: Date;
}): TripIncident {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    status: 'PRIVATE_RECORD',
  };
}

@Injectable()
export class PrivateSafetyService {
  constructor(private readonly repository: PrivateSafetyRepository) {}

  contacts(actorId: string) {
    return this.repository.contacts(actorId);
  }

  async createContact(actorId: string, input: EmergencyContactInput) {
    const contact = await this.repository.createContact(actorId, input, 10);
    if (!contact)
      throw new ConflictException('Puedes guardar hasta diez contactos');
    return contact;
  }

  async replaceContact(
    actorId: string,
    id: string,
    input: EmergencyContactInput,
  ) {
    const contact = await this.repository.replaceContact(actorId, id, input);
    if (!contact) throw new NotFoundException('Contacto inexistente');
    return contact;
  }

  async deleteContact(actorId: string, id: string) {
    if (!(await this.repository.deleteContact(actorId, id)))
      throw new NotFoundException('Contacto inexistente');
  }

  async eligibleTrips(actorId: string, offset: number) {
    const rows = await this.repository.eligibleIncidentTrips(actorId, offset);
    return {
      trips: rows.slice(0, 20).map((trip) => ({
        ...trip,
        departureAt: trip.departureAt.toISOString(),
      })),
      nextOffset: rows.length > 20 && offset < 10000 ? offset + 20 : null,
    };
  }

  async personalHistory(
    actorId: string,
    offset: number,
  ): Promise<PersonalIncidentsPage> {
    const rows = await this.repository.personalIncidents(actorId, offset);
    return {
      records: rows.slice(0, 20).map(({ trip, ...record }) => ({
        ...incidentView(record),
        trip: { ...trip, departureAt: trip.departureAt.toISOString() },
      })),
      nextOffset: rows.length > 20 && offset < 10000 ? offset + 20 : null,
    };
  }

  async exportIncident(actorId: string, id: string): Promise<IncidentExport> {
    const row = await this.repository.personalIncident(actorId, id);
    if (!row) throw new NotFoundException('Incidencia privada no disponible');
    const { trip, ...record } = row;
    return {
      record: {
        ...incidentView(record),
        trip: { ...trip, departureAt: trip.departureAt.toISOString() },
      },
    };
  }

  async incidents(actorId: string, tripId: string) {
    const [access, rows] = await Promise.all([
      this.repository.incidentAccess(actorId, tripId),
      this.repository.incidents(actorId, tripId),
    ]);
    if (!access && !rows.length)
      throw new NotFoundException(
        'Registro de incidencia no disponible para este viaje',
      );
    return { canCreate: !!access, records: rows.map(incidentView) };
  }

  async createIncident(
    actorId: string,
    tripId: string,
    input: TripIncidentInput,
  ) {
    const row = await this.repository.withIncidentContext(
      actorId,
      tripId,
      input,
      ({ status, owned, confirmed, boarded }) =>
        (status === 'EN_CURSO' && (owned || confirmed)) ||
        ((status === 'COMPLETADO' || status === 'INTERRUMPIDO') &&
          (owned || boarded)),
    );
    if (!row)
      throw new NotFoundException(
        'Registro de incidencia no disponible para este viaje',
      );
    return incidentView(row);
  }
}
