# Communa — Lightweight event hosting & attendance

Communa is a small platform for running free community-style events end to end:
publish a page → collect RSVPs → issue QR tickets → check guests in at the door
→ gather feedback.

The app is built with TanStack Start (React 19 + Vite), Tailwind CSS, and
Lovable Cloud (managed Postgres + Auth + Storage). All access is gated by
row-level security.

## Main flow: Publish → RSVP → Ticket → Check-in

### 1. Become a Host (Publish)

1. Click **Sign up** in the top-right and create an account (email + password).
2. Open `/host/new` (also linked from the home page) and fill in your host
   profile: name, short bio, contact email, and an optional logo.
3. You'll be redirected to **your host dashboard** at
   `/host/<your-slug>/dashboard`.
4. Click **New event**, fill in title, description, start/end time, time zone,
   venue (or online link), capacity, and a cover image. The Free/Paid toggle
   shows "Paid — Coming soon" and is disabled.
5. Choose **Public** (appears on `/explore`) or **Unlisted** (link-only) and
   click **Publish**. Use **Unpublish** to take it back to draft, or
   **Duplicate** to clone the event.

### 2. RSVP (Attendee)

1. Anyone (signed in or not) can browse `/explore` and open an event page.
2. Past events display an **"Ended"** badge and hide the RSVP button.
3. Clicking **RSVP** while signed out sends you to `/login?redirect=...` and
   returns you to the same event page after sign in.
4. If capacity is full, the RSVP goes to the **waitlist** (FIFO). When a
   confirmed attendee cancels, the next person in line is automatically
   promoted via a database trigger and sees their new status on refresh.
5. Attendees can **cancel** their RSVP at any time.

### 3. Ticket

1. Upon RSVPing (status = going), the event page immediately shows your
   **unique QR ticket** plus the raw ticket code.
2. The **Add to calendar** button downloads a `.ics` file you can import into
   Google Calendar, Apple Calendar, etc.
3. `/tickets` lists all of your upcoming tickets (going + waitlist) with QR
   codes.

### 4. Check-in

1. From the host dashboard, open **Check-in** for an event. Anyone with the
   `host` or `checker` role for that host can access it.
2. Type or paste the attendee's ticket code into the input and press
   **Check in**. The page shows live counters (`checked-in / going`) and
   prevents duplicate scans (you'll see a "Already checked in" warning).
3. Use **Undo last scan** to reverse the most recent check-in.

### After the event

- The event page invites confirmed attendees to leave a 1-5 star rating and
  optional comment.
- Attendees can upload photos to the gallery; they appear publicly only after
  a host approves them at `/host/<slug>/gallery`.
- Anyone can **Report** an event or photo. Hosts review the queue at
  `/host/<slug>/reports` and can **Hide** problematic content.

### Roles & invites

Hosts invite collaborators at `/host/<slug>/invite`. Pick a role (Host or
Checker), generate a one-shot link, and share it. The invitee signs in and is
added automatically.

- **Host**: full management (events, gallery approval, CSV export, reports).
- **Checker**: limited to opening the check-in page for that host's events.

### Exporting attendance (CSV)

On the host dashboard, every event has a **CSV** button that downloads an
attendance file with columns: `name`, `email`, `rsvp_status`, `check_in_time`.
The file opens cleanly in Excel and Google Sheets. A sample is included as
`sample-rsvps.csv`.

### My Events

`/my-events` aggregates every event you have a role on, with filters by host,
date range, and text. Quick actions surface the dashboard (for hosts) and
check-in (for hosts and checkers).

## Local development

```bash
bun install
bun run dev
```

The app talks to Lovable Cloud using the credentials in `.env`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). Schema lives in
`supabase/migrations/`.