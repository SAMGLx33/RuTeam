export type UsagePreference = 'PASSENGER' | 'DRIVER_AND_PASSENGER';

export type StudentEligibilityStatus =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED_CURRENT'
  | 'INELIGIBLE'
  | 'EXPIRED'
  | 'REVOKED';

export interface Account {
  id: string;
  email: string;
  profile: { displayName: string };
  emailVerified: boolean;
  usagePreference: UsagePreference | null;
  onboarding: { step: number; completed: boolean };
  eligibility: {
    status: StudentEligibilityStatus;
    source: string | null;
    validUntil: string | null;
  };
  capabilities: { passenger: boolean; driverAccess: boolean; driver: boolean };
  synthetic: boolean;
}
export interface LoginInput {
  email: string;
  password: string;
}
export interface RegisterInput extends LoginInput {
  name: string;
  usagePreference: UsagePreference;
}
export interface AccountSessionResponse {
  account: Account;
  expiresAt: string;
  token?: string;
}
export interface OnboardingInput {
  step: number;
  usagePreference?: UsagePreference;
  complete?: boolean;
}
export interface AccessConfiguration {
  accountEmailAvailable: boolean;
}
