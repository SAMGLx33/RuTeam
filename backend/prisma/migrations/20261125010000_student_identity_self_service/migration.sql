-- Retire product administration without deleting users, reviews or historical FKs.
ALTER TABLE "User" ADD COLUMN "disabledAt" TIMESTAMPTZ(3);
ALTER TABLE "User" ALTER COLUMN "demoIdentity" DROP NOT NULL;
UPDATE "User" AS u SET "disabledAt" = CURRENT_TIMESTAMP
WHERE u."role" = 'ADMIN' OR NOT EXISTS (
  SELECT 1 FROM "InstitutionalMembership" AS m
  WHERE m."userId" = u.id AND m."group" = 'STUDENT'
);
UPDATE "AuthSession" AS s SET "revokedAt" = CURRENT_TIMESTAMP
FROM "User" AS u WHERE s."userId" = u.id AND u."disabledAt" IS NOT NULL
AND s."revokedAt" IS NULL;
-- Release only synthetic lookup keys; IDs, email, estamento and audit relations stay.
UPDATE "User" SET "demoIdentity" = NULL WHERE "disabledAt" IS NOT NULL;
ALTER TABLE "User" DROP COLUMN "role", DROP COLUMN "driverDemoApproved";
DROP TYPE "UserRole";
ALTER TABLE "DriverEligibility" ADD COLUMN "verificationSource" VARCHAR(32) NOT NULL DEFAULT 'SELF_DECLARED';
ALTER TABLE "VehicleDocument" ADD COLUMN "verificationSource" VARCHAR(32) NOT NULL DEFAULT 'SELF_DECLARED';
-- An old internal approval is never promoted to authorized-source verification.
UPDATE "DriverEligibility" SET "verificationSource" = 'LEGACY_REVIEW';
UPDATE "VehicleDocument" SET "verificationSource" = 'LEGACY_REVIEW';
ALTER TABLE "DriverEligibility" ADD CONSTRAINT "DriverEligibility_verification_source"
CHECK ("verificationSource" IN ('SELF_DECLARED', 'AUTHORIZED_SOURCE', 'LEGACY_REVIEW'));
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_verification_source"
CHECK ("verificationSource" IN ('SELF_DECLARED', 'AUTHORIZED_SOURCE', 'LEGACY_REVIEW'));
