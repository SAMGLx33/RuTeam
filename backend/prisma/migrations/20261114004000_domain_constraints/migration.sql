-- Invariantes también en BD; nueva migración, no se altera la fundación aplicada.
ALTER TABLE "CampusDestination" ADD CONSTRAINT "CampusDestination_latitude_range" CHECK ("latitude" BETWEEN -90 AND 90);
ALTER TABLE "CampusDestination" ADD CONSTRAINT "CampusDestination_longitude_range" CHECK ("longitude" BETWEEN -180 AND 180);
ALTER TABLE "CampusDestination" ADD CONSTRAINT "CampusDestination_only_usc" CHECK ("campus" = 'USC');
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_name_length" CHECK (char_length(trim("displayName")) BETWEEN 2 AND 80);
