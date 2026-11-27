-- PostgreSQL only delivers NOTIFY after COMMIT. Keep all payloads internal and minimal.
CREATE FUNCTION ruteam_signal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  item jsonb;
  resource text;
BEGIN
  IF TG_OP = 'DELETE' THEN item := to_jsonb(OLD); ELSE item := to_jsonb(NEW); END IF;
  resource := item ->> TG_ARGV[1];
  IF resource IS NOT NULL THEN
    PERFORM pg_notify('ruteam_refresh', TG_ARGV[0] || ':' || resource);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trip_signal AFTER INSERT OR UPDATE OF status, "occupiedSeats", "version" ON "Trip"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('TRIP', 'id');
CREATE TRIGGER seat_signal AFTER INSERT OR UPDATE OF status, "boardedAt", "noShowAt" OR DELETE ON "Reservation"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('TRIP', 'tripId');
CREATE TRIGGER member_signal AFTER INSERT OR DELETE ON "ReservationMember"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('PERSON', 'userId');
CREATE TRIGGER stop_signal AFTER INSERT OR UPDATE OF "reachedAt" OR DELETE ON "TripStop"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('TRIP', 'tripId');
CREATE TRIGGER location_signal AFTER INSERT OR UPDATE OR DELETE ON "TripDriverPosition"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('TRACKING', 'tripId');
CREATE TRIGGER chat_signal AFTER INSERT ON "TripChatMessage"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('CHAT', 'tripId');
CREATE TRIGGER chat_read_signal AFTER INSERT OR UPDATE ON "TripChatRead"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('PERSON', 'userId');
CREATE TRIGGER notice_signal AFTER INSERT OR UPDATE OF "readAt" ON "TripNotification"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('PERSON', 'recipientId');
CREATE TRIGGER pickup_signal AFTER INSERT OR UPDATE OF status ON "PickupProposal"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('PERSON', 'requesterId');
CREATE TRIGGER pickup_trip_signal AFTER INSERT OR UPDATE OF status ON "PickupProposal"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('TRIP', 'tripId');
CREATE TRIGGER schedule_signal AFTER INSERT OR UPDATE OF state, "updatedAt" ON "RecurringTrip"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('PERSON', 'driverId');
CREATE TRIGGER group_signal AFTER INSERT OR UPDATE ON "TripGroupMember"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('PERSON', 'userId');
CREATE TRIGGER session_end_signal AFTER UPDATE OF "revokedAt" OR DELETE ON "AuthSession"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('SESSION', 'id');
CREATE TRIGGER membership_change_signal AFTER INSERT OR UPDATE OR DELETE ON "InstitutionalMembership"
FOR EACH ROW EXECUTE FUNCTION ruteam_signal('PERSON', 'userId');
