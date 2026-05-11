-- 1. Unique ticket codes
ALTER TABLE public.rsvps DROP CONSTRAINT IF EXISTS rsvps_ticket_code_key;
ALTER TABLE public.rsvps ADD CONSTRAINT rsvps_ticket_code_key UNIQUE (ticket_code);

-- 2. Reports: scoped SELECT + UPDATE
DROP POLICY IF EXISTS reports_select_admin_or_self ON public.reports;
DROP POLICY IF EXISTS reports_update_any_auth ON public.reports;

CREATE POLICY reports_select_scoped ON public.reports FOR SELECT
USING (
  auth.uid() = reporter_id
  OR (
    target_type = 'event'
    AND public.is_host_member(auth.uid(), (SELECT host_id FROM public.events WHERE id = reports.target_id))
  )
  OR (
    target_type = 'photo'
    AND public.is_host_member(
      auth.uid(),
      (SELECT e.host_id FROM public.events e
        JOIN public.gallery_photos gp ON gp.event_id = e.id
       WHERE gp.id = reports.target_id)
    )
  )
);

CREATE POLICY reports_update_scoped ON public.reports FOR UPDATE
USING (
  (target_type = 'event'
    AND public.is_host_member(auth.uid(), (SELECT host_id FROM public.events WHERE id = reports.target_id)))
  OR (target_type = 'photo'
    AND public.is_host_member(
      auth.uid(),
      (SELECT e.host_id FROM public.events e
        JOIN public.gallery_photos gp ON gp.event_id = e.id
       WHERE gp.id = reports.target_id)
    ))
);

-- 3. Feedback only allowed after event end
CREATE OR REPLACE FUNCTION public.enforce_feedback_after_end()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e_end timestamptz;
BEGIN
  SELECT ends_at INTO e_end FROM public.events WHERE id = NEW.event_id;
  IF e_end IS NULL OR e_end > now() THEN
    RAISE EXCEPTION 'Feedback is only available after the event ends';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS feedback_after_end ON public.feedback;
CREATE TRIGGER feedback_after_end BEFORE INSERT ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.enforce_feedback_after_end();

-- 4. Unified waitlist promotion (cancel / status change / delete / capacity increase)
CREATE OR REPLACE FUNCTION public.promote_waitlist_for_event(_event uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE cap int; going_count int; next_id uuid;
BEGIN
  SELECT capacity INTO cap FROM public.events WHERE id = _event;
  IF cap IS NULL THEN RETURN; END IF;
  LOOP
    SELECT count(*) INTO going_count FROM public.rsvps
      WHERE event_id = _event AND status = 'going';
    EXIT WHEN going_count >= cap;
    SELECT id INTO next_id FROM public.rsvps
      WHERE event_id = _event AND status = 'waitlist'
      ORDER BY created_at ASC, id ASC LIMIT 1;
    EXIT WHEN next_id IS NULL;
    UPDATE public.rsvps SET status = 'going', position = NULL WHERE id = next_id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.rsvps_after_change_promote()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.promote_waitlist_for_event(COALESCE(NEW.event_id, OLD.event_id));
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE OR REPLACE FUNCTION public.events_after_capacity_change_promote()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.capacity > OLD.capacity THEN
    PERFORM public.promote_waitlist_for_event(NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS rsvp_promote ON public.rsvps;
DROP TRIGGER IF EXISTS trg_rsvps_promote_waitlist ON public.rsvps;
DROP TRIGGER IF EXISTS trg_rsvps_promote_after_update ON public.rsvps;
DROP TRIGGER IF EXISTS trg_rsvps_promote_after_delete ON public.rsvps;
DROP TRIGGER IF EXISTS trg_events_capacity_promote ON public.events;

CREATE TRIGGER trg_rsvps_promote_after_update
AFTER UPDATE OF status ON public.rsvps
FOR EACH ROW
WHEN (OLD.status = 'going' AND NEW.status <> 'going')
EXECUTE FUNCTION public.rsvps_after_change_promote();

CREATE TRIGGER trg_rsvps_promote_after_delete
AFTER DELETE ON public.rsvps
FOR EACH ROW
WHEN (OLD.status = 'going')
EXECUTE FUNCTION public.rsvps_after_change_promote();

CREATE TRIGGER trg_events_capacity_promote
AFTER UPDATE OF capacity ON public.events
FOR EACH ROW EXECUTE FUNCTION public.events_after_capacity_change_promote();

-- 5. Prevent overflow on RSVP insert / re-activation
CREATE OR REPLACE FUNCTION public.enforce_rsvp_capacity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cap int; going_count int;
BEGIN
  IF NEW.status = 'going'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'going')
  THEN
    SELECT capacity INTO cap FROM public.events WHERE id = NEW.event_id;
    SELECT count(*) INTO going_count FROM public.rsvps
      WHERE event_id = NEW.event_id AND status = 'going' AND id <> NEW.id;
    IF cap IS NOT NULL AND going_count >= cap THEN
      NEW.status := 'waitlist';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS rsvps_enforce_capacity ON public.rsvps;
CREATE TRIGGER rsvps_enforce_capacity
BEFORE INSERT OR UPDATE OF status ON public.rsvps
FOR EACH ROW EXECUTE FUNCTION public.enforce_rsvp_capacity();