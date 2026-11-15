-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'MOTORCYCLE');

-- CreateEnum
CREATE TYPE "DocumentReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DemoLicenseCategory" AS ENUM ('CAR', 'MOTORCYCLE', 'BOTH');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PROGRAMADO', 'EN_CURSO', 'COMPLETADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "DriverEligibility" (
    "userId" UUID NOT NULL,
    "category" "DemoLicenseCategory" NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "reviewStatus" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
    "demo" BOOLEAN NOT NULL DEFAULT true,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ(3),

    CONSTRAINT "DriverEligibility_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "plate" VARCHAR(6) NOT NULL,
    "type" "VehicleType" NOT NULL,
    "passengerCapacity" INTEGER NOT NULL,
    "brand" VARCHAR(60) NOT NULL,
    "modelYear" INTEGER NOT NULL,
    "color" VARCHAR(20) NOT NULL,
    "demo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL DEFAULT 'SOAT_DEMO',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "reviewStatus" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
    "demo" BOOLEAN NOT NULL DEFAULT true,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ(3),

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripRuleDefinition" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "description" VARCHAR(100) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TripRuleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "destinationId" UUID NOT NULL,
    "originLabel" VARCHAR(100) NOT NULL,
    "originLatitude" DECIMAL(9,6) NOT NULL,
    "originLongitude" DECIMAL(9,6) NOT NULL,
    "departureAt" TIMESTAMPTZ(3) NOT NULL,
    "estimatedDurationMinutes" INTEGER NOT NULL,
    "expectedEndAt" TIMESTAMPTZ(3) NOT NULL,
    "offeredSeats" INTEGER NOT NULL,
    "occupiedSeats" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "status" "TripStatus" NOT NULL DEFAULT 'PROGRAMADO',
    "providesHelmet" BOOLEAN,
    "locationMode" VARCHAR(8) NOT NULL DEFAULT 'DEMO',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripStop" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,

    CONSTRAINT "TripStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripRuleSelection" (
    "tripId" UUID NOT NULL,
    "ruleId" UUID NOT NULL,

    CONSTRAINT "TripRuleSelection_pkey" PRIMARY KEY ("tripId","ruleId")
);

-- CreateTable
CREATE TABLE "TripEvent" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "Vehicle_ownerId_createdAt_idx" ON "Vehicle"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDocument_vehicleId_key" ON "VehicleDocument"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "TripRuleDefinition_code_key" ON "TripRuleDefinition"("code");

-- CreateIndex
CREATE INDEX "Trip_driverId_departureAt_expectedEndAt_idx" ON "Trip"("driverId", "departureAt", "expectedEndAt");

-- CreateIndex
CREATE UNIQUE INDEX "TripStop_tripId_position_key" ON "TripStop"("tripId", "position");

-- CreateIndex
CREATE INDEX "TripEvent_tripId_createdAt_idx" ON "TripEvent"("tripId", "createdAt");

-- AddForeignKey
ALTER TABLE "DriverEligibility" ADD CONSTRAINT "DriverEligibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverEligibility" ADD CONSTRAINT "DriverEligibility_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "CampusDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRuleSelection" ADD CONSTRAINT "TripRuleSelection_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRuleSelection" ADD CONSTRAINT "TripRuleSelection_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "TripRuleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripEvent" ADD CONSTRAINT "TripEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripEvent" ADD CONSTRAINT "TripEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Restricciones de dominio de Fase2; migración nueva, aún no aplicada al agregar este SQL.
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_passengers_range" CHECK (("type"='CAR' AND "passengerCapacity" BETWEEN 1 AND 4) OR ("type"='MOTORCYCLE' AND "passengerCapacity"=1));
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_plate_format" CHECK (("type"='CAR' AND "plate" ~ '^[A-Z]{3}[0-9]{3}$') OR ("type"='MOTORCYCLE' AND "plate" ~ '^[A-Z]{3}[0-9]{2}[A-Z]$'));
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_year" CHECK ("modelYear">1990);
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_brand" CHECK (char_length(trim("brand"))>=2);
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_color" CHECK ("color" IN ('BLANCO','NEGRO','GRIS','PLATEADO','ROJO','AZUL','VERDE','AMARILLO','OTRO'));
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_coordinates" CHECK ("originLatitude" BETWEEN -90 AND 90 AND "originLongitude" BETWEEN -180 AND 180);
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_capacity" CHECK ("offeredSeats" BETWEEN 1 AND 4 AND "occupiedSeats" BETWEEN 0 AND "offeredSeats");
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_interval" CHECK ("estimatedDurationMinutes" BETWEEN 5 AND 360 AND "expectedEndAt"="departureAt" + "estimatedDurationMinutes" * INTERVAL '1 minute');
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_coordinates" CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180);
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_position" CHECK ("position" BETWEEN 1 AND 10);
