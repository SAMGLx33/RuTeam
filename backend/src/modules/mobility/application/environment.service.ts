import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  EnvironmentalMissing,
  EnvironmentalTotals,
  EnvironmentalTrip,
  MobilityStatistics,
} from '@ruteam/contracts';
import {
  alternativeDifference,
  normalizeEnergy,
  snapshotEnergy,
  type EmissionSnapshot,
  type MobilityAlternative,
} from '../domain/emissions.js';
import type { AlternativeMobilityDto } from '../dto/energy.dto.js';
import {
  EnvironmentRepository,
  type EnvironmentRow,
} from '../infrastructure/repositories/environment.repository.js';

const offsetMs = 5 * 3600_000;
const stdPeriod = (date: Date) =>
  new Date(+date - offsetMs).toISOString().slice(0, 7);
function view(row: EnvironmentRow, userId: string): EnvironmentalTrip {
  const snapshot =
    row.environmentSnapshot as unknown as EmissionSnapshot | null;
  const driver = row.driverId === userId;
  const rider = snapshot?.riders.find((item) => item.userId === userId);
  const distance = driver
    ? row.routeDistanceMeters
    : (rider?.distanceMeters ?? null);
  const attributed = (driver ? snapshot?.driverKg : rider?.kg) ?? null;
  const factor = snapshot?.factor ?? null;
  const booking = row.reservations[0];
  const alternative =
    booking?.mobilityAlternative as unknown as MobilityAlternative | null;
  return {
    tripId: row.id,
    role: driver ? 'DRIVER' : 'PASSENGER',
    period: stdPeriod(row.finishedAt ?? row.departureAt),
    distanceMeters: distance,
    vehicleKg: driver ? (snapshot?.vehicleKg ?? null) : null,
    attributedKg: attributed,
    factor,
    methodology: snapshot?.methodology ?? null,
    dropoffBasis: rider?.dropoffBasis,
    calculatedAt: snapshot?.at ?? null,
    missing: snapshot
      ? attributed !== null && !driver
        ? null
        : snapshot.missing
      : 'NO_SNAPSHOT',
    canDeclareAlternative:
      booking?.requesterId === userId && booking.quantity === 1,
    alternative: alternative
      ? {
          mode: alternative.mode,
          differenceKg: alternativeDifference(
            alternative,
            distance,
            attributed,
            factor,
          ),
        }
      : null,
  };
}

@Injectable()
export class EnvironmentService {
  constructor(private readonly repository: EnvironmentRepository) {}
  async summary(
    userId: string,
    months: number,
  ): Promise<MobilityStatistics['environmental']> {
    const local = new Date(Date.now() - offsetMs);
    const from = new Date(
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - months + 1, 1) +
        offsetMs,
    );
    const missing: Partial<Record<EnvironmentalMissing, number>> = {};
    const totals = new Map<string, EnvironmentalTotals>();
    for (const row of await this.repository.summary(userId, from)) {
      const trip = view(row, userId);
      if (trip.missing)
        missing[trip.missing] = (missing[trip.missing] ?? 0) + 1;
      const scope = trip.factor?.scope;
      if (!scope || (trip.attributedKg === null && trip.vehicleKg === null))
        continue;
      for (const period of [null, trip.period]) {
        const key = [period, trip.role, scope].join(':');
        const total = totals.get(key) ?? {
          period,
          role: trip.role,
          scope,
          vehicleKg: null,
          attributedKg: null,
          trips: 0,
        };
        if (trip.vehicleKg !== null)
          total.vehicleKg = (total.vehicleKg ?? 0) + trip.vehicleKg;
        if (trip.attributedKg !== null)
          total.attributedKg = (total.attributedKg ?? 0) + trip.attributedKg;
        total.trips++;
        totals.set(key, total);
      }
    }
    return totals.size
      ? {
          status: 'AVAILABLE',
          totals: Array.from(totals.values()).sort((a, b) =>
            (b.period ?? '').localeCompare(a.period ?? ''),
          ),
          missing,
        }
      : { status: 'NO_DATA', totals: [], missing };
  }

  async trip(userId: string, id: string) {
    const row = await this.repository.trip(userId, id);
    if (!row) throw new NotFoundException('Estimación del viaje no disponible');
    return view(row, userId);
  }

  async alternative(userId: string, id: string, input: AlternativeMobilityDto) {
    if (input.energy && input.mode !== 'CAR' && input.mode !== 'MOTORCYCLE')
      throw new BadRequestException(
        'El consumo corresponde a una alternativa en automóvil o motocicleta',
      );
    const energy = input.energy
      ? snapshotEnergy(normalizeEnergy(input.energy))
      : null;
    if (
      !(await this.repository.recordAlternative(userId, id, {
        mode: input.mode,
        energy,
      }))
    )
      throw new NotFoundException(
        'Participación individual abordada no disponible',
      );
    return this.trip(userId, id);
  }
}
