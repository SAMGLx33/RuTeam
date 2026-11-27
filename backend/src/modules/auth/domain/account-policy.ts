import { BadRequestException, ForbiddenException } from '@nestjs/common';
export const SYNTHETIC_ACCOUNT_DOMAIN = 'student-fixtures.ruteam.invalid';
export function normalizeAccountEmail(
  email: string,
  allowSynthetic = false,
): string {
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split('@');
  if (
    normalized.length > 254 ||
    parts.length !== 2 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(parts[0]) ||
    (parts[1] !== 'usc.edu.co' &&
      !(allowSynthetic && parts[1] === SYNTHETIC_ACCOUNT_DOMAIN))
  )
    throw new BadRequestException(
      'Utiliza tu correo institucional @usc.edu.co',
    );
  return normalized;
}
export function validateOnboardingTransition(
  current: number,
  next: number,
  preference: string | null,
  emailVerified: boolean,
  eligible: boolean,
  complete: boolean,
): number {
  if (!Number.isInteger(next) || next < 0 || next > 4 || next > current + 1)
    throw new BadRequestException('Completa los pasos del registro en orden');
  if (next >= 2 && !preference)
    throw new BadRequestException('Elige cómo deseas utilizar RuTeam');
  if (complete && (next !== 4 || !emailVerified || !eligible || !preference))
    throw new ForbiddenException(
      'Confirma el correo y acredita elegibilidad antes de acceder al producto',
    );
  return Math.max(current, next);
}
