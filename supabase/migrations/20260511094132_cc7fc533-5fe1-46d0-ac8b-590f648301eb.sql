
-- ============ ENUMS ============
CREATE TYPE event_visibility AS ENUM ('public','unlisted');
CREATE TYPE event_state AS ENUM ('draft','published');
CREATE TYPE rsvp_status AS ENUM ('going','waitlist','cancelled');
CREATE TYPE member_role AS ENUM ('host','checker');
CREATE TYPE gallery_state AS ENUM ('pending','approved','hidden');
CREATE TYPE report_target AS ENUM ('event','photo');
CREATE TYPE report_state AS ENUM ('open','hidden','dismissed');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid()=id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid()=id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ HOSTS ============
CREATE TABLE public.hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  bio text,
  logo_url text,
  contact_email text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hosts_select_all" ON public.hosts FOR SELECT USING (true);
CREATE POLICY "hosts_insert_own" ON public.hosts FOR INSERT WITH CHECK (auth.uid()=owner_id);
CREATE POLICY "hosts_update_owner" ON public.hosts FOR UPDATE USING (auth.uid()=owner_id);

-- ============ HOST MEMBERS ============
CREATE TABLE public.host_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(host_id, user_id, role)
);
ALTER TABLE public.host_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_host_role(_user uuid, _host uuid, _role member_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM host_members WHERE user_id=_user AND host_id=_host AND role=_role)
    OR EXISTS(SELECT 1 FROM hosts WHERE id=_host AND owner_id=_user);
$$;
CREATE OR REPLACE FUNCTION public.is_host_member(_user uuid, _host uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM host_members WHERE user_id=_user AND host_id=_host)
    OR EXISTS(SELECT 1 FROM hosts WHERE id=_host AND owner_id=_user);
$$;

CREATE POLICY "host_members_select_self_or_host" ON public.host_members FOR SELECT
  USING (auth.uid()=user_id OR public.has_host_role(auth.uid(), host_id, 'host'));
CREATE POLICY "host_members_insert_host" ON public.host_members FOR INSERT
  WITH CHECK (public.has_host_role(auth.uid(), host_id, 'host') OR auth.uid()=user_id);
CREATE POLICY "host_members_delete_host" ON public.host_members FOR DELETE
  USING (public.has_host_role(auth.uid(), host_id, 'host'));

-- ============ HOST INVITES ============
CREATE TABLE public.host_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  role member_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.host_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invites_select_all" ON public.host_invites FOR SELECT USING (true);
CREATE POLICY "invites_insert_host" ON public.host_invites FOR INSERT
  WITH CHECK (public.has_host_role(auth.uid(), host_id, 'host'));

-- ============ EVENTS ============
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  venue text,
  online_link text,
  capacity int NOT NULL DEFAULT 50,
  cover_url text,
  visibility event_visibility NOT NULL DEFAULT 'public',
  state event_state NOT NULL DEFAULT 'draft',
  is_paid boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select_public" ON public.events FOR SELECT
  USING (state='published' OR public.is_host_member(auth.uid(), host_id));
CREATE POLICY "events_insert_host" ON public.events FOR INSERT
  WITH CHECK (public.has_host_role(auth.uid(), host_id, 'host'));
CREATE POLICY "events_update_host" ON public.events FOR UPDATE
  USING (public.has_host_role(auth.uid(), host_id, 'host'));
CREATE POLICY "events_delete_host" ON public.events FOR DELETE
  USING (public.has_host_role(auth.uid(), host_id, 'host'));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER events_touch BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ RSVPs ============
CREATE TABLE public.rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status rsvp_status NOT NULL,
  ticket_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8),'hex'),
  position int,
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rsvps_select_self_or_host" ON public.rsvps FOR SELECT
  USING (auth.uid()=user_id OR public.is_host_member(auth.uid(), (SELECT host_id FROM events WHERE id=event_id)));
CREATE POLICY "rsvps_insert_self" ON public.rsvps FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "rsvps_update_self_or_host" ON public.rsvps FOR UPDATE
  USING (auth.uid()=user_id OR public.is_host_member(auth.uid(), (SELECT host_id FROM events WHERE id=event_id)));

-- FIFO waitlist auto-promote on cancel
CREATE OR REPLACE FUNCTION public.promote_waitlist() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  cap int; going_count int; next_id uuid;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status = 'going' THEN
    SELECT capacity INTO cap FROM events WHERE id=NEW.event_id;
    SELECT count(*) INTO going_count FROM rsvps WHERE event_id=NEW.event_id AND status='going';
    IF going_count < cap THEN
      SELECT id INTO next_id FROM rsvps WHERE event_id=NEW.event_id AND status='waitlist' ORDER BY created_at ASC LIMIT 1;
      IF next_id IS NOT NULL THEN
        UPDATE rsvps SET status='going', position=NULL WHERE id=next_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rsvp_promote AFTER UPDATE ON public.rsvps
  FOR EACH ROW EXECUTE FUNCTION public.promote_waitlist();

-- ============ GALLERY ============
CREATE TABLE public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  state gallery_state NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery_select" ON public.gallery_photos FOR SELECT
  USING (state='approved' OR auth.uid()=user_id OR public.is_host_member(auth.uid(),(SELECT host_id FROM events WHERE id=event_id)));
CREATE POLICY "gallery_insert_self" ON public.gallery_photos FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "gallery_update_host" ON public.gallery_photos FOR UPDATE
  USING (public.is_host_member(auth.uid(),(SELECT host_id FROM events WHERE id=event_id)));

-- ============ FEEDBACK ============
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_select_all" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "feedback_insert_self" ON public.feedback FOR INSERT WITH CHECK (auth.uid()=user_id);

-- ============ REPORTS ============
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type report_target NOT NULL,
  target_id uuid NOT NULL,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  state report_state NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert_any" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "reports_select_admin_or_self" ON public.reports FOR SELECT USING (auth.uid()=reporter_id OR auth.uid() IS NOT NULL);
CREATE POLICY "reports_update_any_auth" ON public.reports FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============ STORAGE ============
INSERT INTO storage.buckets (id,name,public) VALUES ('event-assets','event-assets',true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id,name,public) VALUES ('gallery','gallery',true) ON CONFLICT DO NOTHING;

CREATE POLICY "event_assets_public_read" ON storage.objects FOR SELECT USING (bucket_id='event-assets');
CREATE POLICY "event_assets_auth_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id='event-assets' AND auth.role()='authenticated');
CREATE POLICY "gallery_public_read" ON storage.objects FOR SELECT USING (bucket_id='gallery');
CREATE POLICY "gallery_auth_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id='gallery' AND auth.role()='authenticated');
