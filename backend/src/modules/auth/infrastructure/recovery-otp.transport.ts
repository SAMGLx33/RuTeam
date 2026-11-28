import { Inject, Injectable } from '@nestjs/common';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import { declaredAccessEnabled } from '../../institutional-membership/domain/access-policy.js';
import type {
  RecoveryChannel,
  RecoveryOtpPurpose,
} from '../../../generated/prisma/enums.js';
import { otpTiming } from '../domain/recovery-policy.js';

export type RecoverySkipReason =
  | 'ACCOUNT_NOT_FOUND'
  | 'CONTACT_NOT_CONFIRMED'
  | 'CONTACT_NOT_FOUND'
  | 'ACCOUNT_NOT_ELIGIBLE'
  | 'TRANSPORT_UNAVAILABLE'
  | 'COOLDOWN'
  | 'EMISSION_LIMIT'
  | 'PERSISTENCE_ERROR';

export abstract class RecoveryOtpTransport {
  abstract skipped(
    purpose: RecoveryOtpPurpose,
    reason: RecoverySkipReason,
  ): void;
  abstract get available(): boolean;
  abstract deliver(
    purpose: RecoveryOtpPurpose,
    channel: RecoveryChannel,
    contact: string,
    code: string,
  ): void | Promise<void>;
}

@Injectable()
export class ConsoleRecoveryOtpTransport extends RecoveryOtpTransport {
  constructor(@Inject(ENVIRONMENT) private readonly env: Environment) {
    super();
  }

  get available() {
    return (
      this.env.NODE_ENV === 'development' &&
      declaredAccessEnabled(this.env) &&
      this.env.RECOVERY_OTP_TRANSPORT === 'console' &&
      !!this.env.RECOVERY_OTP_SECRET
    );
  }

  skipped(purpose: RecoveryOtpPurpose, reason: RecoverySkipReason) {
    if (
      this.env.NODE_ENV !== 'development' ||
      !declaredAccessEnabled(this.env) ||
      this.env.RECOVERY_OTP_TRANSPORT !== 'console'
    )
      return;
    console.info(
      `[RUTEAM OTP - DEVELOPMENT] Propósito: ${purpose} | Resultado: SKIPPED | Motivo: ${reason}`,
    );
  }

  deliver(
    purpose: RecoveryOtpPurpose,
    channel: RecoveryChannel,
    _contact: string,
    code: string,
  ) {
    if (!this.available) return;
    console.info(
      `[RUTEAM OTP - DEVELOPMENT] Propósito: ${purpose} | Canal: ${channel} | Resultado: ISSUED | Código: ${code} | Vigencia: ${otpTiming.expiresInSeconds / 60} minutos`,
    );
  }
}
