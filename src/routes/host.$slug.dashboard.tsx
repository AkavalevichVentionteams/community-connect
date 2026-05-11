import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, isPast, toCsv, downloadFile, formatCheckInTime } from "@/lib/event-utils";
import { toast } from "sonner";
import { HostRoleGate } from "@/components/HostRoleGate";

export const Route = createFileRoute("/host/$slug/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { slug } = Route.useParams();
  return (
    <HostRoleGate
      slug={slug}
      allow={["host"]}
      redirectPath={`/host/${slug}/dashboard`}
    >
      {({ host }) => <DashboardBody slug={slug} host={host} />}
    </HostRoleGate>
  );
}

function DashboardBody({ slug, host }: { slug: string; host: { id: string; name: string } }) {
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, any>>({});

  async function load() {
    const { data: ev } = await supabase
      .from("events")
      .select("*")
      .eq("host_id", host.id)
      .order("starts_at", { ascending: false });
    setEvents(ev ?? []);
    const s: Record<string, any> = {};
    for (const e of ev ?? []) {
      const { data: r } = await supabase.from("rsvps").select("status, checked_in_at").eq("event_id", e.id);
      s[e.id] = {
        going: r?.filter((x) => x.status === "going").length ?? 0,
        waitlist: r?.filter((x) => x.status === "waitlist").length ?? 0,
        checkedIn: r?.filter((x) => x.checked_in_at).length ?? 0,
      };
    }
    setStats(s);
  }
  useEffect(() => { load(); }, [host.id]);

  async function publish(id: string, on: boolean) {
    await supabase.from("events").update({ state: on ? "published" : "draft" }).eq("id", id);
    toast.success(on ? "Published" : "Unpublished");
    load();
  }

  async function duplicate(e: any) {
    const copy = { ...e };
    delete copy.id; delete copy.created_at; delete copy.updated_at;
    copy.title = `${e.title} (copy)`;
    copy.state = "draft";
    await supabase.from("events").insert(copy);
    toast.success("Duplicated");
    load();
  }

  async function exportCsv(eventId: string, title: string, tz?: string) {
    const { data } = await supabase
      .from("rsvps")
      .select("status, checked_in_at, profiles:user_id(display_name,email)")
      .eq("event_id", eventId);
    const rows = (data ?? []).map((r: any) => ({
      "Name": r.profiles?.display_name ?? "",
      "Email": r.profiles?.email ?? "",
      "RSVP status": r.status,
      "Check-in time": formatCheckInTime(r.checked_in_at, tz),
    }));
    // Prepend UTF-8 BOM so Excel opens non-ASCII names correctly.
    const csv = "\ufeff" + toCsv(rows);
    downloadFile(`${title.replace(/\W+/g, "_")}-rsvps.csv`, csv, "text/csv;charset=utf-8");
  }

  const upcoming = events.filter((e) => !isPast(e.ends_at));
  const past = events.filter((e) => isPast(e.ends_at));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{host.name}</h1>
        <div className="flex gap-2">
          <Link to="/host/$slug/invite" params={{ slug }} className="px-3 py-1.5 border rounded text-sm">Invite</Link>
          <Link to="/host/$slug/reports" params={{ slug }} className="px-3 py-1.5 border rounded text-sm">Reports</Link>
          <Link to="/host/$slug/gallery" params={{ slug }} className="px-3 py-1.5 border rounded text-sm">Gallery</Link>
          <Link to="/host/$slug/events/new" params={{ slug }} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm">New event</Link>
        </div>
      </div>

      <Section title="Upcoming" events={upcoming} stats={stats} slug={slug} onPublish={publish} onDuplicate={duplicate} onExport={exportCsv} />
      <Section title="Past" events={past} stats={stats} slug={slug} onPublish={publish} onDuplicate={duplicate} onExport={exportCsv} />
    </div>
  );
}

function Section({ title, events, stats, slug, onPublish, onDuplicate, onExport }: any) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      {!events.length && (
        <p className="text-sm text-muted-foreground">No {title.toLowerCase()} events.</p>
      )}
      <div className="space-y-3">
        {events.map((e: any) => {
          const s = stats[e.id] || {};
          return (
            <div key={e.id} className="border rounded-lg p-4 bg-card flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <Link to="/events/$id" params={{ id: e.id }} className="font-semibold hover:underline">{e.title}</Link>
                <div className="text-xs text-muted-foreground">{formatDateTime(e.starts_at, e.timezone)} · {e.visibility} · {e.state}</div>
              </div>
              <div className="text-sm">
                <b>{s.going ?? 0}</b> going · <b>{s.waitlist ?? 0}</b> waitlist · <b>{s.checkedIn ?? 0}</b> checked in
              </div>
              <div className="flex gap-2 text-sm">
                <Link to="/host/$slug/events/$id/edit" params={{ slug, id: e.id }} className="px-2 py-1 border rounded">Edit</Link>
                <button onClick={() => onPublish(e.id, e.state !== "published")} className="px-2 py-1 border rounded">{e.state === "published" ? "Unpublish" : "Publish"}</button>
                <button onClick={() => onDuplicate(e)} className="px-2 py-1 border rounded">Duplicate</button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/events/${e.id}`);
                    toast.success("Link copied");
                  }}
                  className="px-2 py-1 border rounded"
                >
                  Copy link
                </button>
                <Link to="/host/$slug/checkin/$eventId" params={{ slug, eventId: e.id }} className="px-2 py-1 border rounded">Check-in</Link>
                <button onClick={() => onExport(e.id, e.title, e.timezone)} className="px-2 py-1 border rounded">CSV</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}