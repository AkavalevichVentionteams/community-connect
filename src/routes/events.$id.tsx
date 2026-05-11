import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDateTime, isPast, makeIcs, downloadFile } from "@/lib/event-utils";
import { toast } from "sonner";
import QRCode from "qrcode";

export const Route = createFileRoute("/events/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("events")
      .select("id,title,description,cover_url,starts_at,ends_at,visibility,state,hosts(name,slug,logo_url)")
      .eq("id", params.id)
      .maybeSingle();
    return { event: data };
  },
  head: ({ loaderData }) => {
    const ev: any = loaderData?.event;
    if (!ev) return { meta: [{ title: "Event" }] };
    const title = `${ev.title} — ${ev.hosts?.name ?? "Event"}`;
    const desc = (ev.description ?? "").slice(0, 160) || `${ev.title} on ${new Date(ev.starts_at).toLocaleString()}`;
    const img = ev.cover_url || ev.hosts?.logo_url;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "event" },
      { name: "twitter:card", content: img ? "summary_large_image" : "summary" },
    ];
    if (img) {
      meta.push({ property: "og:image", content: img });
      meta.push({ name: "twitter:image", content: img });
    }
    return { meta };
  },
  component: EventPage,
});

function EventPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [host, setHost] = useState<any>(null);
  const [rsvp, setRsvp] = useState<any>(null);
  const [counts, setCounts] = useState({ going: 0, waitlist: 0 });
  const [qr, setQr] = useState<string>("");
  const [feedback, setFeedback] = useState<{ rating: number; comment: string }>({ rating: 5, comment: "" });
  const [submittedFb, setSubmittedFb] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [gallery, setGallery] = useState<any[]>([]);

  async function load() {
    const { data: ev } = await supabase.from("events").select("*, hosts(*)").eq("id", id).maybeSingle();
    if (!ev) return;
    setEvent(ev);
    setHost(ev.hosts);
    if (user) {
      const { data: r } = await supabase.from("rsvps").select("*").eq("event_id", id).eq("user_id", user.id).maybeSingle();
      setRsvp(r);
      if (r?.ticket_code) {
        QRCode.toDataURL(r.ticket_code, { width: 240 }).then(setQr);
      }
      const { data: fb } = await supabase.from("feedback").select("*").eq("event_id", id).eq("user_id", user.id).maybeSingle();
      if (fb) setSubmittedFb(true);
    }
    const { data: rs } = await supabase.from("rsvps").select("status").eq("event_id", id);
    const going = rs?.filter((x) => x.status === "going").length ?? 0;
    const wl = rs?.filter((x) => x.status === "waitlist").length ?? 0;
    setCounts({ going, waitlist: wl });
    const { data: g } = await supabase.from("gallery_photos").select("*").eq("event_id", id).eq("state", "approved").order("created_at", { ascending: false });
    setGallery(g ?? []);
  }
  useEffect(() => { load(); }, [id, user?.id]);

  // Realtime: when this user's RSVP changes (e.g. promoted from waitlist → going),
  // refresh so they immediately see the ticket and QR.
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`rsvp-${id}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps", filter: `event_id=eq.${id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, user?.id]);

  if (!event) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;

  const ended = isPast(event.ends_at);
  const isHidden = event.hidden;
  if (isHidden) return <div className="p-8 text-center">This event has been hidden.</div>;

  async function rsvpAction() {
    if (!user) return nav({ to: "/login", search: { redirect: `/events/${id}` } });
    const full = counts.going >= event.capacity;
    const status = full ? "waitlist" : "going";
    let error;
    if (rsvp) {
      // Re-activate an existing (cancelled) RSVP so we never create duplicates.
      ({ error } = await supabase.from("rsvps").update({ status }).eq("id", rsvp.id));
    } else {
      ({ error } = await supabase.from("rsvps").insert({ event_id: id, user_id: user.id, status }));
    }
    if (error) return toast.error(error.message);
    toast.success(full ? "You're on the waitlist" : "You're going!");
    load();
  }

  async function cancel() {
    if (!rsvp) return;
    const { error } = await supabase.from("rsvps").update({ status: "cancelled" }).eq("id", rsvp.id);
    if (error) return toast.error(error.message);
    toast.success("RSVP cancelled");
    load();
  }

  function addCal() {
    const ics = makeIcs({
      uid: event.id,
      title: event.title,
      description: event.description || "",
      location: event.venue || event.online_link || "",
      starts: event.starts_at,
      ends: event.ends_at,
    });
    downloadFile(`${event.title}.ics`, ics, "text/calendar");
  }

  async function submitFeedback() {
    if (!user) return;
    const { error } = await supabase.from("feedback").insert({ event_id: id, user_id: user.id, ...feedback });
    if (error) return toast.error(error.message);
    toast.success("Thanks for your feedback");
    setSubmittedFb(true);
  }

  async function uploadPhoto() {
    if (!user || !photoFile) return;
    const path = `${id}/${user.id}-${Date.now()}-${photoFile.name}`;
    const { error } = await supabase.storage.from("gallery").upload(path, photoFile);
    if (error) return toast.error(error.message);
    const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
    const { error: e2 } = await supabase.from("gallery_photos").insert({ event_id: id, user_id: user.id, photo_url: pub.publicUrl });
    if (e2) return toast.error(e2.message);
    toast.success("Submitted for host approval");
    setPhotoFile(null);
  }

  async function reportEvent() {
    const reason = prompt("Why are you reporting this event?");
    if (!reason) return;
    await supabase.from("reports").insert({ target_type: "event", target_id: id, reporter_id: user?.id ?? null, reason });
    toast.success("Reported. Thank you.");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {event.cover_url && <img src={event.cover_url} alt={event.title} className="w-full aspect-[3/1] object-cover rounded-lg mb-6" />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/hosts/$slug" params={{ slug: host?.slug }} className="text-sm text-muted-foreground hover:underline">
            by {host?.name}
          </Link>
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <div className="text-muted-foreground mt-1">
            {formatDateTime(event.starts_at, event.timezone)} – {formatDateTime(event.ends_at, event.timezone)} ({event.timezone})
          </div>
          <div className="text-sm mt-1">{event.venue || event.online_link}</div>
        </div>
        {ended ? (
          <span className="px-3 py-1 rounded-full bg-muted text-foreground text-sm font-medium">Ended</span>
        ) : null}
      </div>

      <p className="mt-6 whitespace-pre-wrap">{event.description}</p>

      <div className="mt-6 text-sm text-muted-foreground">
        {counts.going} going · {counts.waitlist} waitlisted · capacity {event.capacity}
      </div>

      <div className="mt-6 flex gap-2 flex-wrap">
        {!ended && (!rsvp || rsvp.status === "cancelled") && (
          <button onClick={rsvpAction} className="px-5 py-2.5 rounded bg-primary text-primary-foreground font-medium">
            RSVP
          </button>
        )}
        {!ended && rsvp && rsvp.status !== "cancelled" && (
          <button onClick={cancel} className="px-5 py-2.5 rounded border font-medium">Cancel RSVP</button>
        )}
        {rsvp && rsvp.status !== "cancelled" && (
          <button onClick={addCal} className="px-5 py-2.5 rounded border font-medium">Add to calendar</button>
        )}
        <button onClick={reportEvent} className="px-5 py-2.5 rounded border text-sm text-muted-foreground">Report</button>
      </div>

      {rsvp && rsvp.status === "going" && qr && (
        <div className="mt-8 p-6 border rounded-lg bg-card">
          <div className="font-semibold mb-2">Your ticket</div>
          <img src={qr} alt="QR" className="w-44 h-44" />
          <div className="font-mono text-sm mt-2">{rsvp.ticket_code}</div>
        </div>
      )}
      {rsvp && rsvp.status === "waitlist" && (
        <div className="mt-8 p-4 border rounded-lg bg-muted">
          You're on the waitlist. We'll promote you automatically if a seat opens.
        </div>
      )}

      {ended && user && !submittedFb && rsvp?.status === "going" && (
        <div className="mt-10 p-6 border rounded-lg bg-card">
          <div className="font-semibold mb-3">How was it?</div>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setFeedback({ ...feedback, rating: n })} className={`text-2xl ${n <= feedback.rating ? "text-primary" : "text-muted-foreground"}`}>★</button>
            ))}
          </div>
          <textarea className="w-full border rounded p-2" placeholder="Optional comment" value={feedback.comment} onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })} />
          <button onClick={submitFeedback} className="mt-2 px-4 py-2 rounded bg-primary text-primary-foreground">Submit feedback</button>
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Gallery</h2>
        {gallery.length === 0 && <p className="text-muted-foreground text-sm">No approved photos yet.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {gallery.map((p) => (
            <img key={p.id} src={p.photo_url} alt="" className="aspect-square object-cover rounded" />
          ))}
        </div>
        {user && (
          <div className="mt-4 flex items-center gap-2">
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
            <button disabled={!photoFile} onClick={uploadPhoto} className="px-4 py-2 rounded border">Upload (host approval needed)</button>
          </div>
        )}
      </section>
    </div>
  );
}