import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { isEmail } from 'class-validator';
import type { RecoveryContactInput } from '@ruteam/contracts';

export const otpTiming = { expiresInSeconds: 300, resendAfterSeconds: 60 };
export const otpMaxAttempts = 5;
export const otpMaxEmissions = 5;
export const otpWindowMs = 15 * 60_000;
export const resetGrantMs = 10 * 60_000;

export function normalizeRecoveryContact(
  input: RecoveryContactInput,
  accountEmail: string,
): RecoveryContactInput {
  const contact =
    input.channel === 'EMAIL'
      ? input.contact.trim().toLowerCase()
      : input.contact.trim().replace(/[ ()-]/g, '');
  const valid =
    input.channel === 'EMAIL'
      ? isEmail(contact) && contact !== accountEmail
      : /^\+[1-9][0-9]{7,14}$/.test(contact) &&
        parsePhoneNumberFromString(contact, { extract: false })?.isPossible();
  if (!valid)
    throw new BadRequestException(
      input.channel === 'EMAIL'
        ? 'Escribe un correo personal válido y distinto del institucional.'
        : 'Escribe un número en formato internacional con prefijo +.',
    );
  return { channel: input.channel, contact };
}

export function maskRecoveryContact({
  channel,
  contact,
}: RecoveryContactInput) {
  return channel === 'EMAIL'
    ? `${contact[0]}***@${contact.split('@').at(-1)}`
    : `••••${contact.slice(-4)}`;
}

export function recoveryHmac(secret: string, ...parts: string[]) {
  return createHmac('sha256', secret)
    .update(JSON.stringify(parts))
    .digest('hex');
}

export function equalRecoveryDigest(expected: string, actual: string) {
  return timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(actual, 'hex'),
  );
}
