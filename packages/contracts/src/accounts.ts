export type UsagePreference = 'PASSENGER' | 'DRIVER_AND_PASSENGER';

export type InstitutionalAccessMode = 'DECLARED_DOMAIN' | 'OFFICIAL';

export type StudentEligibilityStatus =
  | 'DECLARED'
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
  institutionalAccess: InstitutionalAccessMode;
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
  institutionalAccess: InstitutionalAccessMode;
}

export interface AccountLifecycleStatus {
  state: 'ACTIVE' | 'DEACTIVATED';
  deletionRequest: {
    id: string;
    status: 'REQUESTED' | 'WITHDRAWN';
    requestedAt: string;
    withdrawnAt: string | null;
  } | null;
  canReactivate: boolean;
}

export interface AccountSettings extends AccountLifecycleStatus {
  sessions: {
    id: string;
    current: boolean;
    createdAt: string | null;
    expiresAt: string;
  }[];
  activeTrips: {
    id: string;
    asDriver: boolean;
    departureAt: string;
    status: import('./index.js').TripSummary['status'];
  }[];
  futureTrips: number;
  futureParticipations: number;
  activeSchedules: number;
}

export interface RegistrationReceipt {
  message: string;
  institutionalAccess: InstitutionalAccessMode;
  emailDeliveryAvailable: boolean;
}

export type RecoveryChannel = 'EMAIL' | 'PHONE';
export interface RecoveryContactInput {
  channel: RecoveryChannel;
  contact: string;
}
export interface RecoveryContactStatus {
  confirmed: {
    channel: RecoveryChannel;
    masked: string;
    confirmedAt: string;
    transport: 'CONSOLE';
  } | null;
  pending: { channel: RecoveryChannel; masked: string } | null;
  confirmationTiming: {
    expiresAt: string | null;
    resendAt: string;
    serverTime: string;
  } | null;
  localDelivery: boolean;
}
export interface RecoveryTiming {
  expiresInSeconds: number;
  resendAfterSeconds: number;
}
export interface PasswordResetAuthorization {
  token: string;
}
