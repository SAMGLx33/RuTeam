ALTER TABLE "TripNotification"
  ALTER COLUMN "matchType" DROP NOT NULL,
  ADD CONSTRAINT "TripNotification_match_or_message_valid"
    CHECK (("kind" = 'TRIP_MATCH' AND "matchType" IS NOT NULL)
           OR ("kind" = 'CHAT_MESSAGE' AND "matchType" IS NULL));
CREATE TABLE "TripChatMessage" (
  "id" UUID NOT NULL,
  "tripId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "clientMessageId" UUID NOT NULL,
  "body" VARCHAR(1000) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TripChatMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TripChatMessage_nonempty" CHECK (length(btrim("body")) > 0),
  CONSTRAINT "TripChatMessage_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TripChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TripChatMessage_tripId_authorId_clientMessageId_key" ON "TripChatMessage" ("tripId", "authorId", "clientMessageId");
CREATE INDEX "TripChatMessage_tripId_createdAt_id_idx" ON "TripChatMessage" ("tripId", "createdAt", "id");
CREATE INDEX "TripChatMessage_authorId_idx" ON "TripChatMessage" ("authorId");
CREATE TABLE "TripChatRead" (
  "tripId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "lastReadAt" TIMESTAMPTZ(3) NOT NULL,
  "lastReadMessageId" UUID NOT NULL,
  CONSTRAINT "TripChatRead_pkey" PRIMARY KEY ("tripId", "userId"),
  CONSTRAINT "TripChatRead_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TripChatRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TripChatRead_userId_idx" ON "TripChatRead" ("userId");
