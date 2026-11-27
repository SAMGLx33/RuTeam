-- Conserva solicitudes y confirmaciones históricas sin promover estados.
ALTER TABLE "Reservation" ADD COLUMN "boardedAt" TIMESTAMPTZ(3);
