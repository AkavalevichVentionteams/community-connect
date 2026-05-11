
DROP TRIGGER IF EXISTS trg_rsvps_promote_waitlist ON public.rsvps;
CREATE TRIGGER trg_rsvps_promote_waitlist
AFTER UPDATE OF status ON public.rsvps
FOR EACH ROW
WHEN (OLD.status = 'going' AND NEW.status = 'cancelled')
EXECUTE FUNCTION public.promote_waitlist();

DROP TRIGGER IF EXISTS trg_events_capacity_promote ON public.events;
CREATE TRIGGER trg_events_capacity_promote
AFTER UPDATE OF capacity ON public.events
FOR EACH ROW
WHEN (NEW.capacity > OLD.capacity)
EXECUTE FUNCTION public.promote_on_capacity_increase();

ALTER TABLE public.rsvps REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rsvps'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps';
  END IF;
END $$;
