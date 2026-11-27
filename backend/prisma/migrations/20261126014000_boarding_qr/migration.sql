CREATE TABLE "ReservationBoardingPass" (
  "reservationId" UUID NOT NULL,
  "pickupId" UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  CONSTRAINT "ReservationBoardingPass_pkey" PRIMARY KEY ("reservationId"),
  CONSTRAINT "ReservationBoardingPass_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReservationBoardingPass_tokenHash_key"
  ON "ReservationBoardingPass"("tokenHash");
