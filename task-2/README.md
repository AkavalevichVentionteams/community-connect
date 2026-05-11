# Events Platform — User Guide

A community events app for publishing events, collecting RSVPs, issuing QR tickets, and running door check-in.

Live preview: see the deployment URL at the bottom of this file.

---

## 1. Publish an event

1. Sign in (or create an account) from the top-right **Sign in** link.
2. Open **My Events** → **Create host** if you do not already belong to one. A host is the organization that owns events.
3. From the host dashboard at `/host/<slug>/dashboard`, click **New event**.
4. Fill in title, description, start / end time, timezone, venue (or online link), and capacity.
5. Save as **Draft** while editing. When ready, hit **Publish** — the event now appears on the public **Explore** page.
6. To take it down, use **Unpublish** from the dashboard. Drafts and unpublished events stay reachable by direct link only to host members.

## 2. RSVP to an event

1. Open the event from **Explore** or via a shared link.
2. Click **RSVP**. If you are signed out, you are sent to the sign-in screen and returned to the event afterwards.
3. If seats remain, your RSVP is confirmed instantly. If the event is full, you join the **waitlist** in FIFO order.
4. When a seat opens (a cancellation or the host raising capacity), the next person on the waitlist is promoted automatically and sees the change on their next view of the event or **Tickets** page.
5. You can cancel anytime from the event page — this frees the seat and promotes the next waitlister.
6. Past (ended) events show an **Ended** state and hide the RSVP button.

## 3. Your ticket

1. After a confirmed RSVP, the event page shows your ticket inline and it is also listed on **/tickets**.
2. Each ticket carries a unique code rendered as a **QR code** plus its text equivalent.
3. Use **Add to Calendar** to download an `.ics` file for Google / Apple / Outlook.
4. The **Tickets** page lists only upcoming events. Past tickets fall off automatically.
5. Cancelling on the event page removes the ticket immediately.

## 4. Check-in (at the door)

1. The event host or an assigned **Checker** opens `/host/<slug>/checkin/<eventId>`.
2. Counters at the top show **Checked-in / Going** and **Remaining**, updating live as scans happen.
3. Type or paste the attendee's ticket code into the input and press **Enter**.
    - Valid going ticket → success toast, counter increments.
    - Unknown code → rejection toast.
    - Already used → duplicate toast, no increment.
    - Cancelled / waitlist → rejection toast.
4. **Undo last** reverses the most recent successful check-in.
5. Only Host and Checker members of the relevant host can open this page; everyone else is denied.

---

## Other useful pages

- **Explore** (`/`) — public search with date range (Upcoming default), location filter, text search, Include Past toggle.
- **My Events** — every event where you hold a role, with host / date / text filters.
- **Host dashboard** — per-event Going / Waitlist / Checked-in counts and CSV export of RSVPs.
- **Gallery** — attendees can submit photos; host approves before they become public.
- **Feedback** — 1–5 star rating with optional comment, available once an event ends.
- **Reports queue** — host reviews reported events and photos and can hide them from public view.

## CSV export schema

RSVP exports use exactly these columns:

```
name,email,rsvp_status,check_in_time
```

`check_in_time` is ISO 8601 UTC or empty. The file is UTF-8 with BOM so Excel and Google Sheets open accented names cleanly. See `example-rsvps.csv`.