ALTER TABLE "User" ADD COLUMN "notificationPreferences" JSONB;

CREATE TABLE "PushDevice" (
  id UUID PRIMARY KEY,
  "token" VARCHAR(160) NOT NULL UNIQUE,
  "installationHash" CHAR(64) NOT NULL,
  "sessionId" UUID NOT NULL REFERENCES "AuthSession"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "platform" VARCHAR(8) NOT NULL CHECK ("platform" IN ('ANDROID', 'IOS')),
  "registeredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMPTZ(3)
);
CREATE INDEX "PushDevice_sessionId_idx" ON "PushDevice" ("sessionId");

CREATE TABLE "PushDelivery" (
  "noticeId" UUID NOT NULL REFERENCES "TripNotification"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "deviceId" UUID NOT NULL REFERENCES "PushDevice"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  stage VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (stage IN ('PENDING', 'TICKET', 'PROVIDER_ACCEPTED', 'FAILED')),
  "ticketId" VARCHAR(100),
  "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseUntil" TIMESTAMPTZ(3),
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("noticeId","deviceId")
);
CREATE INDEX "PushDelivery_stage_availableAt_idx" ON "PushDelivery" (stage, "availableAt");
CREATE INDEX "PushDelivery_deviceId_idx" ON "PushDelivery" ("deviceId");

CREATE FUNCTION enqueue_ruteam_push() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "PushDelivery" ("noticeId","deviceId")
  SELECT NEW.id, d.id FROM "PushDevice" d
  INNER JOIN "AuthSession" s ON s.id = d."sessionId"
  WHERE s."userId" = NEW."recipientId" AND s."revokedAt" IS NULL AND s."expiresAt" > now()
    AND d."revokedAt" IS NULL AND d."registeredAt" <= NEW."createdAt"
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER push_notice_delivery AFTER INSERT ON "TripNotification"
FOR EACH ROW EXECUTE FUNCTION enqueue_ruteam_push();

CREATE TRIGGER notice_preference_signal AFTER UPDATE OF "notificationPreferences" ON "User"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('PERSON','id');
