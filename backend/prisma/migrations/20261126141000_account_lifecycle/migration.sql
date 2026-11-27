ALTER TABLE "User" ADD COLUMN "selfDeactivatedAt" TIMESTAMPTZ(3),
  ADD COLUMN "observedEligibility" VARCHAR(32);
ALTER TABLE "User" ADD CONSTRAINT "User_self_deactivation_state" CHECK (
  "selfDeactivatedAt" IS NULL OR "disabledAt" IS NOT NULL
);

CREATE TABLE "AccountDeletionRequest" (
  "id" UUID PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "withdrawnAt" TIMESTAMPTZ(3),
  CHECK ("withdrawnAt" IS NULL OR "withdrawnAt" >= "requestedAt")
);
CREATE INDEX "AccountDeletionRequest_userId_requestedAt_idx"
  ON "AccountDeletionRequest" ("userId","requestedAt");
CREATE UNIQUE INDEX "AccountDeletionRequest_one_open"
  ON "AccountDeletionRequest" ("userId") WHERE "withdrawnAt" IS NULL;
