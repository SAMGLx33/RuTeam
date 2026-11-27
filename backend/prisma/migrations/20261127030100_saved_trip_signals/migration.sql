CREATE TRIGGER saved_trip_signal AFTER INSERT OR UPDATE OF "alertRequestedAt" OR DELETE ON "SavedTrip"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('PERSON', 'userId');
