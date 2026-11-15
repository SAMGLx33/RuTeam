-- AlterTable
ALTER TABLE "DriverEligibility" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "VehicleDocument" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1;
