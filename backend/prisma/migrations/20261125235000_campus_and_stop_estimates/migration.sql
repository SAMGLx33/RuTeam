ALTER TABLE "CampusDestination"
  ADD COLUMN "campusSiteId" UUID,
  ADD COLUMN "sourceUrl" VARCHAR(300);
ALTER TABLE "TripStop"
  ADD COLUMN "campusSiteId" UUID,
  ADD COLUMN "estimatedOffsetSeconds" INTEGER;

ALTER TABLE "CampusDestination"
  ADD CONSTRAINT "CampusDestination_campusSiteId_fkey"
    FOREIGN KEY ("campusSiteId") REFERENCES "CampusDestination" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CampusDestination_site_parent_valid"
    CHECK ("campusSiteId" IS NULL OR ("campusSiteId" <> "id" AND "kind" <> 'CAMPUS'));
ALTER TABLE "TripStop"
  ADD CONSTRAINT "TripStop_campusSiteId_fkey"
    FOREIGN KEY ("campusSiteId") REFERENCES "CampusDestination" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "TripStop_estimated_offset_valid"
    CHECK ("estimatedOffsetSeconds" IS NULL OR "estimatedOffsetSeconds" BETWEEN 0 AND 21600);
CREATE INDEX "CampusDestination_campusSiteId_idx" ON "CampusDestination" ("campusSiteId");
CREATE INDEX "TripStop_campusSiteId_idx" ON "TripStop" ("campusSiteId");

-- Only assign historical fixture points whose source and provenance are explicit.
UPDATE "CampusDestination" AS point
SET "campusSiteId" = site."id"
FROM "CampusDestination" AS site
WHERE site."code" = 'USC-DEMO-CAMPUS' AND site."demo" AND site."kind" = 'CAMPUS'
  AND point."demo" AND point."code" IN (
    'USC-DEMO-PARQUEADERO', 'USC-DEMO-ENTRADA', 'USC-DEMO-SABIOS',
    'USC-DEMO-SOTANO-1', 'USC-DEMO-SOTANO-2'
  );
UPDATE "TripStop" AS stop
SET "campusSiteId" = point."campusSiteId"
FROM "CampusDestination" AS point
WHERE stop."campusPointId" = point."id" AND point."campusSiteId" IS NOT NULL;

-- The institutional source documents the sites and addresses, not boarding coordinates.
INSERT INTO "CampusDestination" ("id", "code", "name", "campus", "kind", "description", "sourceUrl", "demo", "active")
VALUES
  (gen_random_uuid(), 'USC-CALI-PAMPALINDA', 'Ciudadela Pampalinda', 'USC', 'CAMPUS',
   'Calle 5 # 62-00, barrio Pampalinda, Cali.', 'https://www.usc.edu.co/preguntas-frecuentes/', false, true),
  (gen_random_uuid(), 'USC-CALI-CENTRO', 'Sede Centro', 'USC', 'CAMPUS',
   'Carrera 8 # 8-17, barrio Santa Rosa, Cali.', 'https://www.usc.edu.co/preguntas-frecuentes/', false, true),
  (gen_random_uuid(), 'USC-PALMIRA', 'Seccional Palmira', 'USC', 'CAMPUS',
   'Carrera 29 # 38-47, barrio Alfonso López, Palmira.', 'https://www.usc.edu.co/preguntas-frecuentes/', false, true)
ON CONFLICT ("code") DO NOTHING;
