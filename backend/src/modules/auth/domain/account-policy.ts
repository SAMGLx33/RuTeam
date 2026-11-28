import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  fixtureDomain,
  normalizeInstitutionalEmail,
} from '../../institutional-membership/domain/access-policy.js';
export const SYNTHETIC_ACCOUNT_DOMAIN = fixtureDomain;
export function normalizeAccountEmail(
  email: string,
  allowSynthetic = false,
): string {
  const normalized = normalizeInstitutionalEmail(email, allowSynthetic);
  if (!normalized)
    throw new BadRequestException(
      'Utiliza tu correo institucional @usc.edu.co',
    );
  return normalized;
}
export function validateOnboardingTransition(
  current: number,
  next: number,
  preference: string | null,
  canAccess: boolean,
  complete: boolean,
): number {
  if (!Number.isInteger(next) || next < 0 || next > 4 || next > current + 1)
    throw new BadRequestException('Completa los pasos del registro en orden');
  if (next >= 2 && !preference)
    throw new BadRequestException('Elige cómo deseas utilizar RuTeam');
  if (complete && (next !== 4 || !canAccess || !preference))
    throw new ForbiddenException(
      'Completa las condiciones de acceso antes de usar RuTeam',
    );
  return Math.max(current, next);
}
