export function formatDateTime(iso: string, tz?: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: tz || undefined,
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function isPast(endsAt: string) {
  return new Date(endsAt).getTime() < Date.now();
}

export function makeIcs(opts: {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  starts: string;
  ends: string;
}) {
  // Emit UTC Zulu times so calendar clients honor the wall-clock time
  // consistently without needing an inline VTIMEZONE block.
  const fmt = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "") + "";
  const esc = (s: string) => s.replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const utc = (d: string) => fmt(d); // already ISO → ends in Z
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Communa//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${utc(new Date().toISOString())}`,
    `DTSTART:${utc(opts.starts)}`,
    `DTEND:${utc(opts.ends)}`,
    `SUMMARY:${esc(opts.title)}`,
    opts.description ? `DESCRIPTION:${esc(opts.description)}` : "",
    opts.location ? `LOCATION:${esc(opts.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCsv(rows: Array<Record<string, unknown>>) {
  // Spec wording: name, email, RSVP status, check-in time.
  const headers = ["Name", "Email", "RSVP status", "Check-in time"];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rowsOut = rows.length
    ? rows.map((r) => headers.map((h) => esc(r[h])).join(","))
    : [];
  return [headers.join(","), ...rowsOut].join("\n");
}

// Format a timestamp so Excel and Google Sheets recognize it as a date,
// not a text blob. "YYYY-MM-DD HH:MM:SS" in the event's local time zone.
export function formatCheckInTime(iso: string | null | undefined, tz?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || undefined,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}