CREATE TABLE "TripExpenseEstimate" (
  "tripId" UUID NOT NULL,
  "fuelCop" INTEGER NOT NULL,
  "tollsCop" INTEGER NOT NULL,
  "parkingCop" INTEGER NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "TripExpenseEstimate_pkey" PRIMARY KEY ("tripId"),
  CONSTRAINT "TripExpenseEstimate_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TripExpenseEstimate_pesos_valid" CHECK (
    "fuelCop" BETWEEN 0 AND 100000000 AND
    "tollsCop" BETWEEN 0 AND 100000000 AND
    "parkingCop" BETWEEN 0 AND 100000000
  )
);
