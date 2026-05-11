-- 1) One feedback row per (event, user)
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_event_user_unique UNIQUE (event_id, user_id);

-- 2) Invite expiry + revocation
ALTER TABLE public.host_invites
  ADD COLUMN expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  ADD COLUMN revoked_at timestamptz NULL;

-- 3) De-duplicate open reports (same reporter, same target, still open)
CREATE UNIQUE INDEX reports_open_unique
  ON public.reports (target_type, target_id, reporter_id)
  WHERE state = 'open' AND reporter_id IS NOT NULL;