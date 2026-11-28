ALTER TYPE "AccountTokenPurpose" ADD VALUE 'OTP_PASSWORD_RESET';

CREATE TYPE "RecoveryChannel" AS ENUM ('EMAIL', 'PHONE');
CREATE TYPE "RecoveryOtpPurpose" AS ENUM ('CONTACT_CONFIRMATION', 'PASSWORD_RESET');
CREATE TYPE "RecoveryTransport" AS ENUM ('CONSOLE');

CREATE TABLE "RecoveryContact" (
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "pending" BOOLEAN NOT NULL,
    "channel" "RecoveryChannel" NOT NULL,
    "contact" VARCHAR(254) NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3),
    "transport" "RecoveryTransport",
    CONSTRAINT "RecoveryContact_pkey" PRIMARY KEY ("userId", "pending")
);

CREATE TABLE "RecoveryOtp" (
    "id" UUID NOT NULL PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "purpose" "RecoveryOtpPurpose" NOT NULL,
    "contactKey" CHAR(64) NOT NULL,
    "digest" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMPTZ(3)
);

CREATE INDEX "RecoveryOtp_userId_createdAt_idx" ON "RecoveryOtp"("userId", "createdAt");
CREATE INDEX "RecoveryOtp_contactKey_createdAt_idx" ON "RecoveryOtp"("contactKey", "createdAt");
