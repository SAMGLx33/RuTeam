CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED');
CREATE UNIQUE INDEX "TripStop_tripId_id_key" ON "TripStop"("tripId", "id");

CREATE TABLE "Reservation" (
  "id" UUID NOT NULL,
  "tripId" UUID NOT NULL,
  "requesterId" UUID NOT NULL,
  "pickupId" UUID NOT NULL,
  "dropoffId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL CHECK ("quantity" BETWEEN 1 AND 4),
  "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "confirmedAt" TIMESTAMPTZ(3),
  CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Reservation_distinct_stops" CHECK ("pickupId" <> "dropoffId"),
  CONSTRAINT "Reservation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Reservation_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Reservation_tripId_pickupId_fkey" FOREIGN KEY ("tripId", "pickupId") REFERENCES "TripStop"("tripId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Reservation_tripId_dropoffId_fkey" FOREIGN KEY ("tripId", "dropoffId") REFERENCES "TripStop"("tripId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Reservation_tripId_status_createdAt_idx" ON "Reservation"("tripId", "status", "createdAt");
CREATE INDEX "Reservation_requesterId_createdAt_idx" ON "Reservation"("requesterId", "createdAt");

CREATE TABLE "ReservationMember" (
  "reservationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  CONSTRAINT "ReservationMember_pkey" PRIMARY KEY ("reservationId", "userId"),
  CONSTRAINT "ReservationMember_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReservationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ReservationMember_userId_idx" ON "ReservationMember"("userId");
