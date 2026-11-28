import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { TripSearchPage } from '@ruteam/contracts';
import {
  canSubmitDeclaredDocuments,
  locallyEligible,
  type AccessConfiguration,
} from '../../institutional-membership/domain/access-policy.js';
import { VehiculoPolicy } from '../../vehicles/domain/policies/vehiculo.policy.js';
import type { SearchTripsDto } from '../dto/search-trips.dto.js';
import {
  matchStops,
  passesNear,
  tripDirection,
  type StopPreference,
} from '../domain/models/driver-route.js';
import {
  presentAvailable,
  presentItinerary,
  presentStops,
  type TripCursor,
  type ViajeRepository,
} from '../infrastructure/repositories/trips.repository.js';

function parsePreference(input?: string): StopPreference | undefined {
  if (input === undefined || input === 'USC') return input;
  if (isUUID(input)) return { campusPointId: input.toLowerCase() };
  const parts = input.split(',').map((part) => part.trim());
  if (
    parts.length === 2 &&
    parts.every((part) => /^-?\d+(\.\d+)?$/.test(part))
  ) {
    const [latitude, longitude] = parts.map(Number);
    if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180)
      return { latitude, longitude };
  }
  throw new BadRequestException(
    'Usa USC, el identificador de un punto institucional o latitud,longitud',
  );
}

// Cursors may advance through excluded candidates. Only the server can read them.
const cursorKey = randomBytes(32);

function encodeCursor(cursor: TripCursor): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', cursorKey, nonce);
  const body = cipher.update(
    `${cursor.departureAt.toISOString()}|${cursor.id}`,
  );
  return Buffer.concat([
    nonce,
    body,
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString('base64url');
}

function decodeCursor(input?: string): TripCursor | undefined {
  if (input === undefined) return undefined;
  try {
    const raw = Buffer.from(input, 'base64url');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      cursorKey,
      raw.subarray(0, 12),
      { authTagLength: 16 },
    );
    decipher.setAuthTag(raw.subarray(-16));
    const body = Buffer.concat([
      decipher.update(raw.subarray(12, -16)),
      decipher.final(),
    ]);
    const [instant, id] = body.toString('utf8').split('|');
    return { departureAt: new Date(instant), id };
  } catch {
    throw new BadRequestException('Cursor inválido. Reinicia la búsqueda.');
  }
}

export async function searchTrips(
  repository: ViajeRepository,
  actorId: string,
  data: SearchTripsDto,
  access: AccessConfiguration,
): Promise<TripSearchPage> {
  const from = parsePreference(data.from);
  const to = parsePreference(data.to);
  const near = parsePreference(data.near);
  if (near !== undefined && (typeof near !== 'object' || !('latitude' in near)))
    throw new BadRequestException(
      'Selecciona una ubicación geográfica para la proximidad',
    );
  const radiusKm = Number(data.radiusKm ?? 0);
  if (
    (data.radiusKm !== undefined && !(radiusKm > 0 && radiusKm < 4)) ||
    (!radiusKm &&
      [from, to, near].some(
        (point) => typeof point === 'object' && 'latitude' in point,
      ))
  )
    throw new BadRequestException(
      'Indica un radio mayor que 0 y menor que 4 km',
    );
  const now = new Date();
  const after = data.after ? new Date(data.after) : undefined;
  const before = data.before ? new Date(data.before) : undefined;
  if (after && before && before <= after)
    throw new BadRequestException('La franja horaria debe estar ordenada');
  const seats = Number(data.seats ?? 1);
  if (!Number.isInteger(seats) || seats < 1 || seats > 4)
    throw new BadRequestException('Cupos fuera de rango');
  let cursor = decodeCursor(data.cursor);
  const items: { driverId: string; card: TripSearchPage['items'][number] }[] =
    [];
  for (let page = 0; page < 4; page++) {
    const candidates = await repository.searchCandidates({
      now,
      after,
      before,
      seats,
      actorId,
      cursor,
    });
    for (const trip of candidates) {
      cursor = { departureAt: trip.departureAt, id: trip.id };
      const declaredDocs = canSubmitDeclaredDocuments(trip.driver, access);
      if (
        trip.offeredSeats - trip.occupiedSeats < seats ||
        !locallyEligible(trip.driver, access, now) ||
        !VehiculoPolicy.esPublicable(
          trip.driver.driverEligibility,
          trip.expectedEndAt,
          declaredDocs,
        ) ||
        !VehiculoPolicy.esPublicable(
          trip.vehicle.document,
          trip.expectedEndAt,
          declaredDocs,
        ) ||
        (trip.driver.driverEligibility?.category !== 'BOTH' &&
          trip.driver.driverEligibility?.category !== trip.vehicle.type)
      )
        continue;
      const stops = presentStops(trip);
      const direction = tripDirection(stops);
      if (!direction || (data.direction && direction !== data.direction))
        continue;
      if (near) {
        const geometry = presentItinerary(trip)?.geometry;
        if (!geometry || !passesNear(geometry, near, radiusKm)) continue;
      }
      const match = matchStops(stops, {
        from,
        to,
        radiusKm,
        fromText: data.fromText,
        toText: data.toText,
      });
      if (match)
        items.push({
          driverId: trip.driverId,
          card: presentAvailable(trip, match),
        });
      if (items.length === 20) break;
    }
    if (items.length === 20) break;
    if (candidates.length < 50)
      return {
        items: await repository.attachDriverReputations(items),
        nextCursor: null,
      };
  }
  return {
    items: await repository.attachDriverReputations(items),
    nextCursor: cursor ? encodeCursor(cursor) : null,
  };
}
