import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HostRoleGate } from "@/components/HostRoleGate";
import { formatDateTime, isPast } from "@/lib/event-utils";

export const Route = createFileRoute("/host/$slug/checkin/")({
  component: CheckinIndex,
});

function CheckinIndex() {
  const { slug } = Route.useParams();
  return (
    <HostRoleGate slug={slug} allow={["host", "checker"]} redirectPath={`/host/${slug}/checkin`}>
      {({ host }) => <Body slug={slug} hostId={host.id} hostName={host.name} />}
    </HostRoleGate>
  );
}

function Body({ slug, hostId, hostName }: { slug: string; hostId: string; hostName: string }) {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id,title,starts_at,ends_at,timezone,state")
        .eq("host_id", hostId)
        .order("starts_at", { ascending: true });
      setEvents(data ?? []);
    })();
  }, [hostId]);
  const upcoming = events.filter((e) => !isPast(e.ends_at));
  const past = events.filter((e) => isPast(e.ends_at));
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{hostName} · Check-in</h1>
      <p className="text-muted-foreground mb-6 text-sm">Pick an event to scan tickets for.</p>
      <Section title="Upcoming" rows={upcoming} slug={slug} />
      <Section title="Past" rows={past} slug={slug} />
    </div>
  );
}

function Section({ title, rows, slug }: { title: string; rows: any[]; slug: string }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
      <div className="space-y-2">
        {rows.map((e) => (
          <Link key={e.id} to="/host/$slug/checkin/$eventId" params={{ slug, eventId: e.id }} className="block border rounded p-3 hover:bg-muted">
            <div className="font-medium">{e.title}</div>
            <div className="text-xs text-muted-foreground">{formatDateTime(e.starts_at, e.timezone)}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}