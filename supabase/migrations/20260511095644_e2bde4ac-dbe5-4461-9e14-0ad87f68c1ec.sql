-- 1. RSVPs: track Add-to-Calendar
ALTER TABLE public.rsvps ADD COLUMN IF NOT EXISTS calendar_added_at timestamptz;

-- 2. Feedback: one per (event,user), rating 1..5
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_unique_per_user_event UNIQUE (event_id, user_id);
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_rating_range CHECK (rating BETWEEN 1 AND 5);

-- 3. Capacity-increase promotion trigger
CREATE OR REPLACE FUNCTION public.promote_on_capacity_increase()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  going_count int;
  next_id uuid;
BEGIN
  IF NEW.capacity > OLD.capacity THEN
    LOOP
      SELECT count(*) INTO going_count FROM public.rsvps
        WHERE event_id = NEW.id AND status = 'going';
      EXIT WHEN going_count >= NEW.capacity;
      SELECT id INTO next_id FROM public.rsvps
        WHERE event_id = NEW.id AND status = 'waitlist'
        ORDER BY created_at ASC LIMIT 1;
      EXIT WHEN next_id IS NULL;
      UPDATE public.rsvps SET status = 'going', position = NULL WHERE id = next_id;
    END LOOP;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_events_capacity_promote ON public.events;
CREATE TRIGGER trg_events_capacity_promote
AFTER UPDATE OF capacity ON public.events
FOR EACH ROW EXECUTE FUNCTION public.promote_on_capacity_increase();

-- Ensure existing cancellation promotion trigger is attached
DROP TRIGGER IF EXISTS trg_rsvps_promote_waitlist ON public.rsvps;
CREATE TRIGGER trg_rsvps_promote_waitlist
AFTER UPDATE OF status ON public.rsvps
FOR EACH ROW EXECUTE FUNCTION public.promote_waitlist();

-- 4. CheckIns audit trail
CREATE TABLE public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rsvp_id uuid NOT NULL REFERENCES public.rsvps(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  checker_id uuid NOT NULL,
  ticket_code text NOT NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  undone_at timestamptz,
  undone_by uuid,
  note text
);
CREATE INDEX idx_check_ins_event ON public.check_ins(event_id);
CREATE INDEX idx_check_ins_rsvp ON public.check_ins(rsvp_id);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY check_ins_select
ON public.check_ins FOR SELECT
USING (
  public.is_host_member(auth.uid(), (SELECT host_id FROM public.events WHERE id = event_id))
  OR auth.uid() = (SELECT user_id FROM public.rsvps WHERE id = rsvp_id)
);

CREATE POLICY check_ins_insert
ON public.check_ins FOR INSERT
WITH CHECK (
  public.is_host_member(auth.uid(), (SELECT host_id FROM public.events WHERE id = event_id))
  AND auth.uid() = checker_id
);

CREATE POLICY check_ins_update_host
ON public.check_ins FOR UPDATE
USING (public.is_host_member(auth.uid(), (SELECT host_id FROM public.events WHERE id = event_id)));

-- 5. Gallery approvals audit
CREATE TABLE public.gallery_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.gallery_photos(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','hidden')),
  decided_at timestamptz NOT NULL DEFAULT now(),
  note text
);
CREATE INDEX idx_gallery_approvals_photo ON public.gallery_approvals(photo_id);

ALTER TABLE public.gallery_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY gallery_approvals_select_host
ON public.gallery_approvals FOR SELECT
USING (
  public.is_host_member(
    auth.uid(),
    (SELECT e.host_id FROM public.events e
       JOIN public.gallery_photos gp ON gp.event_id = e.id
       WHERE gp.id = photo_id)
  )
);

CREATE POLICY gallery_approvals_insert_host
ON public.gallery_approvals FOR INSERT
WITH CHECK (
  public.is_host_member(
    auth.uid(),
    (SELECT e.host_id FROM public.events e
       JOIN public.gallery_photos gp ON gp.event_id = e.id
       WHERE gp.id = photo_id)
  ) AND auth.uid() = approver_id
);

-- 6. Export jobs
CREATE TYPE public.export_status AS ENUM ('queued','running','done','failed');

CREATE TABLE public.export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  status public.export_status NOT NULL DEFAULT 'queued',
  file_url text,
  row_count integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX idx_export_jobs_host ON public.export_jobs(host_id);

ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY export_jobs_select_host
ON public.export_jobs FOR SELECT
USING (public.has_host_role(auth.uid(), host_id, 'host'::member_role));

CREATE POLICY export_jobs_insert_host
ON public.export_jobs FOR INSERT
WITH CHECK (
  public.has_host_role(auth.uid(), host_id, 'host'::member_role)
  AND auth.uid() = requested_by
);

CREATE POLICY export_jobs_update_host
ON public.export_jobs FOR UPDATE
USING (public.has_host_role(auth.uid(), host_id, 'host'::member_role));

-- 7. Projection views for EventTicket, WaitlistEntry, GalleryItem
CREATE OR REPLACE VIEW public.event_tickets AS
SELECT
  id            AS ticket_id,
  event_id,
  user_id       AS attendee_id,
  ticket_code   AS code,
  created_at    AS issued_at,
  calendar_added_at,
  checked_in_at
FROM public.rsvps
WHERE status = 'going';

CREATE OR REPLACE VIEW public.waitlist_entries AS
SELECT
  id            AS entry_id,
  event_id,
  user_id       AS attendee_id,
  row_number() OVER (PARTITION BY event_id ORDER BY created_at ASC) AS queue_order,
  created_at,
  'waiting'::text AS state
FROM public.rsvps
WHERE status = 'waitlist';

CREATE OR REPLACE VIEW public.gallery_items AS
SELECT
  id,
  event_id,
  user_id       AS uploader_id,
  photo_url,
  state,
  created_at
FROM public.gallery_photos;