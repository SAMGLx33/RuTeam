import { DomainPolicyError } from '../../../../common/errors/domain-policy.error.js';
export class Viaje {
  static validarPublicacion(
    input: {
      departureAt: string;
      estimatedDurationMinutes: number;
      offeredSeats: number;
      stops: { position: number }[];
    },
    now: Date,
  ): Date {
    const departure = new Date(input.departureAt);
    if (
      !Number.isFinite(departure.getTime()) ||
      departure.getTime() <= now.getTime() + 30 * 60000
    )
      throw new DomainPolicyError(
        'La salida debe ser posterior a 30 minutos desde ahora',
      );
    if (
      !Number.isInteger(input.estimatedDurationMinutes) ||
      input.estimatedDurationMinutes < 5 ||
      input.estimatedDurationMinutes > 360
    )
      throw new DomainPolicyError(
        'Duración DEMO fuera del rango 5–360 minutos',
      );
    if (
      !Number.isInteger(input.offeredSeats) ||
      input.offeredSeats < 1 ||
      input.offeredSeats > 4
    )
      throw new DomainPolicyError('Cupos fuera de rango');
    if (input.stops.some((stop, index) => stop.position !== index + 1))
      throw new DomainPolicyError(
        'Paradas deben tener orden consecutivo desde 1',
      );
    return new Date(
      departure.getTime() + input.estimatedDurationMinutes * 60000,
    );
  }
  static ocupacion(offered: number, occupied: number): 'DISPONIBLE' | 'LLENO' {
    return occupied >= offered ? 'LLENO' : 'DISPONIBLE';
  }
}
