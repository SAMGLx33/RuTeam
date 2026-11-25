import { DomainPolicyError } from '../../../../common/errors/domain-policy.error.js';
export const VEHICLE_COLORS = [
  'BLANCO',
  'NEGRO',
  'GRIS',
  'PLATEADO',
  'ROJO',
  'AZUL',
  'VERDE',
  'AMARILLO',
  'OTRO',
] as const;
export interface DocumentSnapshot {
  reviewStatus: string;
  expiresAt: Date;
  demo: boolean;
  verificationSource?: string;
}
export class VehiculoPolicy {
  static validarCapacidad(type: string, passengers: number): void {
    const max = type === 'CAR' ? 4 : type === 'MOTORCYCLE' ? 1 : 0;
    if (!Number.isInteger(passengers) || passengers < 1 || passengers > max)
      throw new DomainPolicyError(
        'Capacidad de pasajeros no autorizada para el vehículo',
      );
  }
  static validarPlaca(type: string, plate: string): void {
    if (
      !(type === 'CAR' ? /^[A-Z]{3}[0-9]{3}$/ : /^[A-Z]{3}[0-9]{2}[A-Z]$/).test(
        plate,
      )
    )
      throw new DomainPolicyError('Placa inválida para el tipo de vehículo');
  }
  static esPublicable(
    document: DocumentSnapshot | null,
    through: Date,
  ): boolean {
    const status = this.estadoDocumental(document, through);
    return (
      status === 'VERIFIED' ||
      (status === 'DECLARED' && document?.demo === true)
    );
  }
  static estadoDocumental(
    document: DocumentSnapshot | null,
    through: Date,
  ): 'DECLARED' | 'VERIFIED' | 'EXPIRED' | 'UNVERIFIED' {
    if (!document) return 'UNVERIFIED';
    if (!(document.expiresAt.getTime() > through.getTime())) return 'EXPIRED';
    if (
      document.verificationSource === 'AUTHORIZED_SOURCE' &&
      document.reviewStatus === 'APPROVED'
    )
      return 'VERIFIED';
    if (document.demo && document.verificationSource === 'SELF_DECLARED')
      return 'DECLARED';
    return 'UNVERIFIED';
  }
}
