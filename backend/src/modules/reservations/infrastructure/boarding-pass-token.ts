import { createHash, randomBytes } from 'node:crypto';

const BOARDING_PASS_TTL_MS = 120000;
const prefix = 'ruteam-board:v1:';
export const boardingPassPattern = /^ruteam-board:v1:[A-Za-z0-9_-]{43}$/;

export function hashBoardingPass(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function createBoardingPass(now: Date) {
  const code = prefix + randomBytes(32).toString('base64url');
  return {
    code,
    hash: hashBoardingPass(code),
    expiresAt: new Date(now.getTime() + BOARDING_PASS_TTL_MS),
  };
}
