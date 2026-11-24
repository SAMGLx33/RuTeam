CREATE TYPE "CampusPointKind" AS ENUM ('CAMPUS', 'ENTRANCE', 'PLAZA', 'PARKING', 'BASEMENT', 'BUILDING', 'COMMON_AREA', 'OTHER');
CREATE TYPE "StopAccess" AS ENUM ('PICKUP', 'DROPOFF', 'BOTH', 'WAYPOINT');

ALTER TABLE "CampusDestination"
  ALTER COLUMN "latitude" DROP NOT NULL,
  ALTER COLUMN "longitude" DROP NOT NULL,
  ADD COLUMN "kind" "CampusPointKind" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "description" VARCHAR(240),
  ADD COLUMN "accessReference" VARCHAR(160),
  ADD COLUMN "level" VARCHAR(24),
  ADD CONSTRAINT "CampusDestination_coordinate_pair" CHECK (("latitude" IS NULL) = ("longitude" IS NULL));

UPDATE "CampusDestination" SET "kind" = 'ENTRANCE' WHERE "code" = 'USC-DEMO-ENTRADA';
UPDATE "CampusDestination" SET "kind" = 'PARKING' WHERE "code" = 'USC-DEMO-PARQUEADERO';

ALTER TABLE "Trip"
  ALTER COLUMN "destinationId" DROP NOT NULL,
  ADD COLUMN "routeDescription" VARCHAR(240),
  ADD COLUMN "routeGeometry" JSONB,
  ADD COLUMN "routeDistanceMeters" INTEGER,
  ADD CONSTRAINT "Trip_route_or_legacy_destination" CHECK ("routeDescription" IS NOT NULL OR "destinationId" IS NOT NULL),
  ADD CONSTRAINT "Trip_route_distance" CHECK ("routeDistanceMeters" IS NULL OR ("routeDistanceMeters" > 0 AND "routeGeometry" IS NOT NULL));
CREATE INDEX "Trip_status_departureAt_id_idx" ON "Trip"("status", "departureAt", "id");

ALTER TABLE "TripStop"
  DROP CONSTRAINT "TripStop_position",
  ADD COLUMN "access" "StopAccess" NOT NULL DEFAULT 'PICKUP',
  ADD COLUMN "campusPointId" UUID,
  ADD COLUMN "campus" VARCHAR(20),
  ADD COLUMN "instructions" VARCHAR(240),
  ADD CONSTRAINT "TripStop_campusPointId_fkey" FOREIGN KEY ("campusPointId") REFERENCES "CampusDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "TripStop_position" CHECK ("position" BETWEEN 0 AND 11);
