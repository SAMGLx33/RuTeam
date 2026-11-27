ALTER TABLE "Vehicle" ADD COLUMN "energyProfile" JSONB;
ALTER TABLE "Trip" ADD COLUMN "environmentInput" JSONB;
ALTER TABLE "Trip" ADD COLUMN "environmentSnapshot" JSONB;
ALTER TABLE "Reservation" ADD COLUMN "mobilityAlternative" JSONB;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_environment_completed"
  CHECK ("environmentSnapshot" IS NULL OR status = 'COMPLETADO');
