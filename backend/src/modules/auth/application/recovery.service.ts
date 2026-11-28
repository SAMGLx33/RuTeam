import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import type {
  PasswordResetAuthorization,
  RecoveryContactInput,
  RecoveryContactStatus,
} from '@ruteam/contracts';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import type { RecoveryOtpPurpose } from '../../../generated/prisma/enums.js';
import { normalizeInstitutionalEmail } from '../../institutional-membership/domain/access-policy.js';
import { hashPassword, verifyPassword } from '../domain/password.js';
import {
  equalRecoveryDigest,
  maskRecoveryContact,
  normalizeRecoveryContact,
  otpTiming,
  recoveryHmac,
  resetGrantMs,
} from '../domain/recovery-policy.js';
import { RecoveryRepository } from '../infrastructure/repositories/recovery.repository.js';
import { RecoveryOtpTransport } from '../infrastructure/recovery-otp.transport.js';
import type { SessionPrincipal } from './auth.service.js';

const digestGrant = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const invalidPublicCode =
  'Código incorrecto, vencido o sin intentos disponibles. Solicita otro si corresponde.';

@Injectable()
export class RecoveryService {
  constructor(
    private readonly repository: RecoveryRepository,
    private readonly transport: RecoveryOtpTransport,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  availability() {
    return { localDelivery: this.transport.available };
  }

  async status(userId: string): Promise<RecoveryContactStatus> {
    const contacts = await this.repository.contacts(userId);
    const confirmed = contacts.find((contact) => !contact.pending);
    const pending = contacts.find((contact) => contact.pending);
    const now = new Date();
    const timing =
      pending && this.transport.available
        ? await this.repository.confirmationTiming(
            userId,
            this.contactKey(pending),
            now,
          )
        : null;
    return {
      ...this.availability(),
      confirmationTiming: timing
        ? {
            expiresAt: timing.expiresAt?.toISOString() ?? null,
            resendAt: timing.resendAt.toISOString(),
            serverTime: now.toISOString(),
          }
        : null,
      confirmed:
        confirmed?.confirmedAt && confirmed.transport
          ? {
              channel: confirmed.channel,
              masked: maskRecoveryContact(confirmed),
              confirmedAt: confirmed.confirmedAt.toISOString(),
              transport: confirmed.transport,
            }
          : null,
      pending: pending
        ? { channel: pending.channel, masked: maskRecoveryContact(pending) }
        : null,
    };
  }

  async configure(
    principal: SessionPrincipal,
    input: RecoveryContactInput,
    password: string,
  ) {
    const user = await this.repository.findCredentials(principal.userId);
    if (
      !(await verifyPassword(password, user?.passwordHash ?? null)) ||
      !user?.passwordHash
    )
      throw new ForbiddenException('La contraseña actual no coincide.');
    const contact = normalizeRecoveryContact(input, user.email.toLowerCase());
    if (
      !(await this.repository.configure(principal, user.passwordHash, contact))
    )
      throw new ForbiddenException(
        'Vuelve a iniciar sesión para configurar tu medio de recuperación.',
      );
    return this.status(principal.userId);
  }

  async registrationCode(userId: string) {
    if (this.transport.available)
      await this.send(userId, 'CONTACT_CONFIRMATION');
  }

  async sendConfirmation(principal: SessionPrincipal) {
    this.requireDelivery();
    const result = await this.send(
      principal.userId,
      'CONTACT_CONFIRMATION',
      principal,
    );
    if (!result)
      throw new BadRequestException({
        code: 'OTP_NO_PENDING_CONTACT',
        message: 'No hay un medio pendiente de confirmación.',
      });
    if (result.kind !== 'ISSUED') {
      const seconds = Math.max(
        1,
        Math.ceil((result.retryAt.getTime() - Date.now()) / 1000),
      );
      const limited = result.kind === 'EMISSION_LIMIT';
      throw new HttpException(
        {
          code: limited ? 'OTP_EMISSION_LIMIT' : 'OTP_RESEND_COOLDOWN',
          message: limited
            ? `Alcanzaste el límite de envíos. Intenta en ${Math.ceil(seconds / 60)} min.`
            : `Espera ${seconds} s antes de solicitar otro código.`,
        },
        429,
      );
    }
    return otpTiming;
  }

  async requestReset(email: string) {
    const purpose = 'PASSWORD_RESET';
    if (!this.transport.available)
      this.transport.skipped(purpose, 'TRANSPORT_UNAVAILABLE');
    this.requireDelivery();
    try {
      const normalized = normalizeInstitutionalEmail(email);
      const user =
        normalized && (await this.repository.findAccount(normalized));
      if (user) await this.send(user.id, purpose);
      else this.transport.skipped(purpose, 'ACCOUNT_NOT_FOUND');
    } catch {
      this.transport.skipped(purpose, 'PERSISTENCE_ERROR');
      throw new ServiceUnavailableException(
        'No pudimos procesar la solicitud. Intenta más tarde.',
      );
    }
    return {
      ...otpTiming,
      message:
        'Si la cuenta tiene un medio confirmado y puede recibir otro código, el servidor lo emitirá.',
    };
  }

  private async send(
    userId: string,
    purpose: RecoveryOtpPurpose,
    principal?: SessionPrincipal,
  ) {
    const delivery = await this.repository.withAccount(
      userId,
      async (tx, now) => {
        const contact = await this.repository.contact(tx, userId, purpose);
        if (!contact?.confirmedAt && purpose === 'PASSWORD_RESET') {
          const pending = await this.repository.contact(
            tx,
            userId,
            'CONTACT_CONFIRMATION',
          );
          return {
            skipped: pending
              ? ('CONTACT_NOT_CONFIRMED' as const)
              : ('CONTACT_NOT_FOUND' as const),
          };
        }
        if (!contact) return { skipped: 'CONTACT_NOT_FOUND' as const };
        const result = await this.repository.issue(
          tx,
          userId,
          purpose,
          now,
          this.contactKey(contact),
          (prior) => {
            let candidate: string;
            do {
              candidate = String(randomInt(1_000_000)).padStart(6, '0');
            } while (
              prior.some((otp) =>
                this.matcher(
                  userId,
                  otp.purpose,
                  candidate,
                )(otp.id, otp.digest),
              )
            );
            const id = randomUUID();
            return {
              id,
              code: candidate,
              digest: this.codeDigest(id, userId, purpose, candidate),
            };
          },
        );
        return { contact, result };
      },
      principal,
    );
    if (!delivery || delivery.skipped) {
      if (purpose === 'PASSWORD_RESET')
        this.transport.skipped(
          purpose,
          delivery?.skipped ?? 'ACCOUNT_NOT_ELIGIBLE',
        );
      return;
    }
    if (delivery.result.kind !== 'ISSUED') {
      if (purpose === 'PASSWORD_RESET')
        this.transport.skipped(purpose, delivery.result.kind);
      return delivery.result;
    }
    await this.transport.deliver(
      purpose,
      delivery.contact.channel,
      delivery.contact.contact,
      delivery.result.code,
    );
    return delivery.result;
  }

  async confirm(principal: SessionPrincipal, code: string) {
    this.requireDelivery();
    const userId = principal.userId;
    const outcome = await this.repository.withAccount(
      userId,
      async (tx, now) => {
        const purpose = 'CONTACT_CONFIRMATION';
        const contact = await this.repository.contact(tx, userId, purpose);
        if (!contact) return 'MISSING';
        const result = await this.repository.check(
          tx,
          userId,
          purpose,
          now,
          this.contactKey(contact),
          this.matcher(userId, purpose, code),
        );
        if (result === 'VALID')
          await this.repository.confirmContact(tx, userId, now, contact);
        return result;
      },
      principal,
    );
    if (outcome === 'EXPIRED')
      throw new BadRequestException({
        code: 'OTP_EXPIRED',
        message: 'El código venció. Solicita uno nuevo.',
      });
    if (outcome === 'ATTEMPTS')
      throw new BadRequestException({
        code: 'OTP_ATTEMPTS_EXHAUSTED',
        message: 'Agotaste los cinco intentos. Solicita un código nuevo.',
      });
    if (typeof outcome === 'number')
      throw new BadRequestException({
        code: 'OTP_INCORRECT',
        message: `Código incorrecto. Intentos restantes: ${outcome}.`,
      });
    if (outcome !== 'VALID')
      throw new BadRequestException({
        code: 'OTP_UNAVAILABLE',
        message:
          'No hay un código vigente para este medio. Si sigue pendiente, solicita uno nuevo.',
      });
    return this.status(userId);
  }

  async verify(
    email: string,
    code: string,
  ): Promise<PasswordResetAuthorization> {
    this.requireDelivery();
    const normalized = normalizeInstitutionalEmail(email);
    const user = normalized && (await this.repository.findAccount(normalized));
    if (!user) throw new BadRequestException(invalidPublicCode);
    const token = await this.repository.withAccount(
      user.id,
      async (tx, now) => {
        const purpose = 'PASSWORD_RESET';
        const contact = await this.repository.contact(tx, user.id, purpose);
        if (!contact?.confirmedAt) return null;
        const outcome = await this.repository.check(
          tx,
          user.id,
          purpose,
          now,
          this.contactKey(contact),
          this.matcher(user.id, purpose, code),
        );
        if (outcome !== 'VALID') return null;
        const grant = randomBytes(32).toString('base64url');
        await this.repository.grant(
          tx,
          user.id,
          now,
          digestGrant(grant),
          new Date(now.getTime() + resetGrantMs),
        );
        return grant;
      },
    );
    if (!token) throw new BadRequestException(invalidPublicCode);
    return { token };
  }

  async reset(token: string, password: string) {
    this.requireDelivery();
    if (
      !/^[A-Za-z0-9_-]{43}$/.test(token) ||
      !(await this.repository.reset(
        digestGrant(token),
        await hashPassword(password),
      ))
    )
      throw new BadRequestException(
        'La autorización no es válida, ya se usó o venció. Solicita otro código.',
      );
    return { message: 'Contraseña actualizada. Inicia sesión de nuevo.' };
  }

  private requireDelivery() {
    if (!this.transport.available)
      throw new ServiceUnavailableException(
        'El transporte OTP de desarrollo no está habilitado.',
      );
  }

  private contactKey(contact: RecoveryContactInput) {
    return recoveryHmac(
      this.env.RECOVERY_OTP_SECRET!,
      'contact',
      contact.channel,
      contact.contact,
    );
  }

  private codeDigest(
    id: string,
    userId: string,
    purpose: RecoveryOtpPurpose,
    code: string,
  ) {
    return recoveryHmac(
      this.env.RECOVERY_OTP_SECRET!,
      'otp',
      id,
      userId,
      purpose,
      code,
    );
  }

  private matcher(userId: string, purpose: RecoveryOtpPurpose, code: string) {
    return (id: string, stored: string) =>
      equalRecoveryDigest(stored, this.codeDigest(id, userId, purpose, code));
  }
}
