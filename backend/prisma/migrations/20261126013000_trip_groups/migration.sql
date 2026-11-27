CREATE TABLE "TripGroup" (
  "id" UUID NOT NULL,
  "tripId" UUID NOT NULL,
  "organizerId" UUID NOT NULL,
  "pickupId" UUID NOT NULL,
  "dropoffId" UUID NOT NULL,
  "expectedMembers" INTEGER NOT NULL,
  "inviteHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  CONSTRAINT "TripGroup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TripGroup_expected_members" CHECK ("expectedMembers" BETWEEN 2 AND 4),
  CONSTRAINT "TripGroup_distinct_stops" CHECK ("pickupId" <> "dropoffId"),
  CONSTRAINT "TripGroup_lifetime" CHECK ("expiresAt" > "createdAt" AND "expiresAt" <= "createdAt" + INTERVAL '2 hours'),
  CONSTRAINT "TripGroup_timestamps" CHECK (NOT ("confirmedAt" IS NOT NULL AND "revokedAt" IS NOT NULL)
    AND ("confirmedAt" IS NULL OR ("confirmedAt" >= "createdAt" AND "confirmedAt" < "expiresAt"))
    AND ("revokedAt" IS NULL OR "revokedAt" >= "createdAt")),
  CONSTRAINT "TripGroup_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TripGroup_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TripGroup_pickup_fkey" FOREIGN KEY ("tripId", "pickupId") REFERENCES "TripStop"("tripId", "id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "TripGroup_dropoff_fkey" FOREIGN KEY ("tripId", "dropoffId") REFERENCES "TripStop"("tripId", "id") ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TripGroup_inviteHash_key" ON "TripGroup"("inviteHash");
CREATE INDEX "TripGroup_tripId_expiresAt_idx" ON "TripGroup"("tripId", "expiresAt");
CREATE INDEX "TripGroup_organizerId_idx" ON "TripGroup"("organizerId");

CREATE TABLE "TripGroupMember" (
  "groupId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "consentedAt" TIMESTAMPTZ(3) NOT NULL,
  "withdrawnAt" TIMESTAMPTZ(3),
  "reservationId" UUID,
  CONSTRAINT "TripGroupMember_pkey" PRIMARY KEY ("groupId", "userId"),
  CONSTRAINT "TripGroupMember_consent" CHECK ("withdrawnAt" IS NULL OR ("withdrawnAt" >= "consentedAt" AND "reservationId" IS NULL)),
  CONSTRAINT "TripGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TripGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TripGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TripGroupMember_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TripGroupMember_reservationId_key" ON "TripGroupMember"("reservationId");
CREATE INDEX "TripGroupMember_userId_groupId_idx" ON "TripGroupMember"("userId", "groupId");
