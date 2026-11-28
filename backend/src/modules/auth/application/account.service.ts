import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import { declaredAccessEnabled } from '../../institutional-membership/domain/access-policy.js';
import {
  AuthRepository,
  type SessionUser,
} from '../infrastructure/repositories/auth.repository.js';
import { AuthService } from './auth.service.js';
import { EmailDelivery } from '../infrastructure/email-delivery.js';
import { hashPassword, verifyPassword } from '../domain/password.js';
import {
  normalizeAccountEmail,
  SYNTHETIC_ACCOUNT_DOMAIN,
} from '../domain/account-policy.js';
import type { AccountRegisterDto, OnboardingDto } from '../dto/account.dto.js';
type TokenPurpose = 'EMAIL_CONFIRMATION' | 'PASSWORD_RESET';
const received = {
  message:
    'Solicitud recibida. Revisa el correo y sigue las instrucciones si corresponde; no compartas tus enlaces.',
};
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  constructor(
    private readonly repository: AuthRepository,
    private readonly auth: AuthService,
    private readonly email: EmailDelivery,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  emailAvailable(): boolean {
    if (
      !this.env.AUTH_TOKEN_SECRET ||
      this.env.AUTH_TOKEN_SECRET.length < 32 ||
      !this.env.AUTH_PUBLIC_URL ||
      !this.email.isReady()
    )
      return false;
    const url = new URL(this.env.AUTH_PUBLIC_URL);
    return (
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (url.protocol === 'https:' ||
        (this.env.NODE_ENV !== 'production' &&
          url.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
    );
  }
  private requireEmail(): void {
    if (!this.emailAvailable())
      throw new ServiceUnavailableException(
        'Verificación de correo no disponible: configura un transporte SMTP seguro y el secreto de enlaces',
      );
  }
  async register(input: AccountRegisterDto) {
    const email = normalizeAccountEmail(input.email);
    const name = input.name.trim();
    if (name.length < 2) throw new BadRequestException('Escribe tu nombre');
    const passwordHash = await hashPassword(input.password);
    const declared = declaredAccessEnabled(this.env);
    const institutionalAccess = declared ? 'DECLARED_DOMAIN' : 'OFFICIAL';
    const user = await this.repository.createAccount(
      email,
      passwordHash,
      name,
      input.usagePreference,
      declared,
    );
    if (declared)
      return {
        institutionalAccess,
        emailDeliveryAvailable: false,
        message:
          'Si se creó la cuenta, puedes iniciar sesión con tu contraseña de RuTeam.',
      };
    const emailDeliveryAvailable = this.emailAvailable();
    if (user && emailDeliveryAvailable)
      await this.deliverLink(user, 'EMAIL_CONFIRMATION');
    return { ...received, emailDeliveryAvailable, institutionalAccess };
  }
  async login(emailInput: string, password: string) {
    const allowSynthetic =
      this.env.NODE_ENV !== 'production' &&
      this.env.demo &&
      this.env.VERIFICATION_PROVIDER === 'demo';
    const email = normalizeAccountEmail(emailInput, allowSynthetic);
    const user = await this.repository.findAccount(email);
    const matches = await verifyPassword(password, user?.passwordHash ?? null);
    const syntheticAllowed =
      !!user &&
      this.auth.syntheticAllowed(user) &&
      email.endsWith(`@${SYNTHETIC_ACCOUNT_DOMAIN}`);
    if (
      !user ||
      !matches ||
      user.disabledAt ||
      (user.demoIdentity !== null && !syntheticAllowed)
    )
      throw new UnauthorizedException(
        'Correo o contraseña de RuTeam inválidos',
      );
    const session = await this.auth.createIdentitySession(
      user.id,
      user.passwordHash!,
      this.auth.usesDeclaredAccess(user),
    );
    return { ...session, account: await this.present(user) };
  }
  async account(userId: string) {
    const user = await this.repository.findUser(userId);
    if (!user || user.disabledAt)
      throw new ForbiddenException('Cuenta no disponible');
    return this.present(user);
  }
  async requestEmail(emailInput: string, purpose: TokenPurpose) {
    this.requireEmail();
    const email = normalizeAccountEmail(emailInput);
    const user = await this.repository.findAccount(email);
    const declared = declaredAccessEnabled(this.env);
    const actionable =
      user &&
      !user.disabledAt &&
      user.demoIdentity === null &&
      (purpose === 'PASSWORD_RESET'
        ? (!declared && !user.declaredDomainAccessAt) || !!user.emailVerifiedAt
        : !declared && !user.declaredDomainAccessAt && !user.emailVerifiedAt);
    if (actionable) await this.deliverLink(user, purpose);
    return received;
  }
  async confirmEmail(token: string, password: string) {
    if (declaredAccessEnabled(this.env))
      throw new BadRequestException(
        'La confirmación de correo no está habilitada en esta instalación',
      );
    const digest = this.digest(token, 'EMAIL_CONFIRMATION');
    if (
      !(await this.repository.consumeAccountToken(
        digest,
        'EMAIL_CONFIRMATION',
        await hashPassword(password),
      ))
    )
      throw new BadRequestException(
        'El enlace no es válido, ya se usó o venció',
      );
    return {
      message:
        'Correo confirmado. La elegibilidad estudiantil se comprueba por separado.',
    };
  }
  async resetPassword(token: string, password: string) {
    const digest = this.digest(token, 'PASSWORD_RESET');
    const passwordHash = await hashPassword(password);
    if (
      !(await this.repository.consumeAccountToken(
        digest,
        'PASSWORD_RESET',
        passwordHash,
        declaredAccessEnabled(this.env),
      ))
    )
      throw new BadRequestException(
        'El enlace no es válido, ya se usó o venció',
      );
    return {
      message:
        'Contraseña actualizada. Inicia sesión de nuevo; se cerraron las sesiones anteriores.',
    };
  }
  async onboarding(userId: string, input: OnboardingDto) {
    return this.present(
      await this.repository.updateOnboarding(userId, input, (user) =>
        this.auth
          .institutionalStatus(user)
          .then((status) => this.auth.canUseProduct(user, status)),
      ),
    );
  }
  private digest(token: string, purpose: TokenPurpose): string {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new BadRequestException(
        'El enlace no es válido, ya se usó o venció',
      );
    if (!this.env.AUTH_TOKEN_SECRET || this.env.AUTH_TOKEN_SECRET.length < 32)
      throw new ServiceUnavailableException(
        'Verificación de correo no disponible',
      );
    return createHmac('sha256', this.env.AUTH_TOKEN_SECRET)
      .update(`${purpose}\0${token}`)
      .digest('hex');
  }
  private async deliverLink(
    user: SessionUser,
    purpose: TokenPurpose,
  ): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + (purpose === 'PASSWORD_RESET' ? 15 : 30) * 60000,
    );
    const issued = await this.repository.issueAccountToken(
      user.id,
      purpose,
      this.digest(token, purpose),
      expiresAt,
      declaredAccessEnabled(this.env),
    );
    if (!issued) return;
    const url = new URL(
      purpose === 'EMAIL_CONFIRMATION' ? '/verify-email' : '/recover-access',
      this.env.AUTH_PUBLIC_URL!,
    );
    url.searchParams.set('token', token);
    const body = `${purpose === 'EMAIL_CONFIRMATION' ? 'Confirma el control de tu correo de RuTeam' : 'Elige una nueva contraseña propia de RuTeam'}:\n${url.toString()}\nEl enlace es de uso único y vence en ${purpose === 'PASSWORD_RESET' ? 15 : 30} minutos. Si no lo solicitaste, ignóralo. Este correo no acredita matrícula vigente ni es una autenticación oficial de la USC.`;
    // SMTP errors must not change a public response based on the recipient.
    void this.email
      .send(user.email, 'Instrucciones de acceso a RuTeam', body)
      .catch(() => this.logger.warn('ACCOUNT_EMAIL_DELIVERY_FAILED'));
  }
  private async present(user: SessionUser) {
    const status = await this.auth.institutionalStatus(user);
    await this.repository.observeEligibility(user, status);
    return {
      id: user.id,
      email: user.email,
      profile: { displayName: user.profile?.displayName ?? '' },
      emailVerified: !!user.emailVerifiedAt,
      institutionalAccess: this.env.INSTITUTIONAL_ACCESS_MODE,
      usagePreference: user.usagePreference,
      onboarding: {
        step: user.onboardingStep,
        completed: !!user.onboardingCompletedAt,
      },
      eligibility: {
        status,
        source:
          status === 'DECLARED' ? null : (user.membership?.verifiedBy ?? null),
        validUntil:
          status === 'DECLARED'
            ? null
            : (user.membership?.validUntil.toISOString() ?? null),
      },
      capabilities: this.auth.capabilitiesFor(
        user,
        this.auth.canUseProduct(user, status),
      ),
      synthetic: user.demoIdentity !== null,
    };
  }
}
