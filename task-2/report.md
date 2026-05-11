# Project Report

## Tools and techniques used

- **Frontend**: TanStack Start v1 (React 19, file-based routing), Vite 7, Tailwind v4, shadcn/ui, framer-motion, lucide-react.
- **Backend**: Lovable Cloud (managed Supabase) — Postgres, Row Level Security, Storage buckets (`event-assets`, `gallery`), Auth (email + Google).
- **Realtime**: Supabase `postgres_changes` channels for live check-in counters and waitlist promotion visibility.
- **QR**: client-side QR rendering from each ticket's unique `ticket_code` (16-hex random default at DB level).
- **CSV**: client-built UTF-8 with BOM, `text/csv;charset=utf-8`, blob download.
- **Database logic**: SQL triggers `promote_waitlist` (cancellation → FIFO promote) and `promote_on_capacity_increase` (capacity bump → drain queue), both `SECURITY DEFINER` helpers `has_host_role` / `is_host_member` to keep RLS recursion-free.
- **Role model**: `host_members(user_id, host_id, role)` separate from profiles — Host, Checker, Member — checked via security-definer functions inside every RLS policy.

## What worked

- Splitting waitlist promotion into Postgres triggers made the behavior deterministic and trivially testable: cancellation, capacity increase, and multi-entry queues all share the same FIFO path.
- RLS-only authorization (no client trust) meant the same queries are safe to run from anonymous Explore browsing, signed-in RSVP, and host dashboards.
- Realtime on the `rsvps` table for the check-in page gave live counters across multiple checkers with no polling.
- Keeping the CSV schema to exactly `name,email,rsvp_status,check_in_time` plus a UTF-8 BOM eliminated Excel mojibake on accented names without extra columns.
- File-based routes under `src/routes/` made the host area (`/host/$slug/dashboard`, `/host/$slug/checkin/$eventId`, `/host/$slug/reports`, `/host/$slug/gallery`) compose cleanly with a single `HostRoleGate` component.

## What did not work (and how it was resolved)

- **First waitlist attempt used a client-side promote-next call after cancellation.** That race-conditioned on simultaneous cancels. Moved to a DB trigger; the order is now guaranteed by `ORDER BY created_at ASC LIMIT 1` under a single transaction.
- **CHECK constraints with `now()` were rejected by Postgres** (immutability). Replaced time-window validations with triggers where needed.
- **Capacity-increase promotion was initially missing** — only cancellation triggered promotion. Added `promote_on_capacity_increase` AFTER UPDATE trigger on `events` that loops until the new capacity is filled or the waitlist is empty.
- **Excel opened CSV with broken UTF-8 characters.** Added a BOM (`\ufeff`) prefix and switched MIME type to `text/csv;charset=utf-8`.
- **Anonymous SSR loaders calling protected server functions** caused build-time 401s during prerender. Moved those calls into client components / `useQuery` and reserved loader fetches for `_authenticated/` routes.

## Notable decisions

- **Roles in a separate table, never on `profiles`.** Avoids the classic privilege-escalation pattern.
- **Unlisted events** are gated only by visibility=`unlisted` and remain reachable by direct link — no search exposure, no Explore listing.
- **Past events stay browsable** to anonymous users (with an `Include Past` toggle) so shared links never 404, but the RSVP control is hidden and an explicit `Ended` badge is rendered everywhere the event surfaces.
- **Ticket code is the QR payload** — no separate signed JWT. The code is unique, server-generated, and validated against `rsvps` + `check_ins` on every scan, which keeps the check-in flow offline-friendly for door staff.
- **Waitlist promotion happens in the database, not the app.** Clients only observe the result through realtime; correctness does not depend on a specific tab being open.
- **CSV columns are exactly what the spec asks for.** No extra "internal" columns were added.