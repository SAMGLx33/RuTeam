CREATE TABLE "TripDriverPosition" (
  "tripId" UUID PRIMARY KEY REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "latitude" DECIMAL(8,6) NOT NULL CHECK ("latitude" BETWEEN -90 AND 90),
  "longitude" DECIMAL(9,6) NOT NULL CHECK ("longitude" BETWEEN -180 AND 180),
  "capturedAt" TIMESTAMPTZ(3) NOT NULL,
  "sharedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "TripDriverPosition_sharedAt_idx" ON "TripDriverPosition"("sharedAt");

CREATE FUNCTION "removeClosedTripDriverPosition"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM "TripDriverPosition" WHERE "tripId" = NEW."id";
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Trip_removeClosedDriverPosition"
AFTER UPDATE OF "status" ON "Trip"
FOR EACH ROW
WHEN (OLD."status" = 'EN_CURSO' AND NEW."status" <> 'EN_CURSO')
EXECUTE FUNCTION "removeClosedTripDriverPosition"();
