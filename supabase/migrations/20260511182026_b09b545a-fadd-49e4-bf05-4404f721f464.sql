
-- Enforce that feedback can only be submitted by attendees who were "going"
CREATE OR REPLACE FUNCTION public.enforce_feedback_after_end()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  e_end timestamptz;
  has_going boolean;
BEGIN
  SELECT ends_at INTO e_end FROM public.events WHERE id = NEW.event_id;
  IF e_end IS NULL OR e_end > now() THEN
    RAISE EXCEPTION 'Feedback is only available after the event ends';
  END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.rsvps
    WHERE event_id = NEW.event_id AND user_id = NEW.user_id AND status = 'going'
  ) INTO has_going;
  IF NOT has_going THEN
    RAISE EXCEPTION 'Only confirmed attendees can leave feedback';
  END IF;
  RETURN NEW;
END $function$;

-- Ensure ticket codes are unique
ALTER TABLE public.rsvps ADD CONSTRAINT rsvps_ticket_code_unique UNIQUE (ticket_code);
