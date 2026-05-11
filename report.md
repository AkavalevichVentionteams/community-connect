# Build report — Communa

## Tools & techniques used

- **TanStack Start v1** (React 19, Vite 7) for SSR-capable file-based routing.
- **Lovable Cloud** (managed Supabase: Postgres, Auth, Storage) as the
  backend; all access from the browser is gated by RLS policies.
- **Tailwind CSS v4** with semantic design tokens in `src/styles.css`
  (oklch-based palette).
- **shadcn/ui + sonner** for toasts; everything else is hand-rolled to keep
  the bundle and component surface small.
- **qrcode** npm package generating data URLs in the browser — no server
  round-trip and no camera dependency, which matches the task ("manual code
  entry is sufficient").
- **`.ics` generation** done client-side from a tiny helper, avoiding a
  Google Calendar or external API.
- Auto-promotion of the FIFO waitlist implemented with a Postgres `AFTER
  UPDATE` trigger so it stays correct under concurrency and doesn't depend on
  any client code.

## Schema overview

`profiles`, `hosts`, `host_members`, `host_invites`, `events`, `rsvps`,
`gallery_photos`, `feedback`, `reports`. Two enums encode event lifecycle
(`state`: draft/published, `visibility`: public/unlisted). RLS:

- Public can read published, non-hidden events and approved gallery photos.
- Only host owners + `host` role members can mutate hosts/events.
- Checkers can read and update RSVPs only for events under their host (via
  the `is_host_member` security-definer helper).
- A single trigger (`promote_waitlist`) handles waitlist FIFO promotion when
  an RSVP transitions `going → cancelled`.

## What worked

- Keeping the data layer thin (one Supabase table per concept) plus RLS made
  it possible to build every page as a small client component without server
  functions — fast iteration and easy reasoning about access.
- Storing `ticket_code` with a `gen_random_bytes()` default on the `rsvps`
  row removed the need for a separate `tickets` table; QR + check-in just
  point at that column.
- The trigger-based waitlist promotion is short, race-safe, and required no
  background worker.
- Flat dot-routes (`host.$slug.dashboard.tsx`) kept all routes in one folder
  and avoided nested layout files.

## What did not work / trade-offs

- I considered TanStack `createServerFn` for protected mutations, but with
  RLS already enforcing authorization the extra indirection didn't earn its
  keep at this scope. If the app grew (admin-only flows, third-party
  integrations, signed webhooks) I'd move sensitive logic server-side.
- Seeding requires `hosts.owner_id` to be nullable so the demo host can exist
  without a real `auth.users` row. New hosts created through the UI always
  get a real owner.
- `host.$slug.gallery` and `host.$slug.reports` rely on RLS for
  authorization rather than a client-side route guard, which means an
  unauthorized user can open the URL but will see an empty list. This is a
  small UX nit, not a security problem.

## Notable decisions

- "Paid" toggle is a disabled radio with an italic "Coming soon" label — no
  pricing or checkout code anywhere in the app, exactly as the spec requires.
- QR codes are generated on the client. Scanning is out of scope per the task
  ("manual code entry is sufficient"); the check-in input auto-focuses so a
  USB scanner that types codes still works.
- Past events expose feedback + gallery upload but explicitly hide RSVP and
  show an "Ended" badge.
- CSV export uses native UTF-8 with header `name,email,rsvp_status,check_in_time`
  and quote-escapes any cell containing commas, quotes, or newlines so it
  loads cleanly in Excel + Google Sheets.