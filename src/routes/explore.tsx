import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, isPast } from "@/lib/event-utils";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore events — Communa" },
      { name: "description", content: "Browse upcoming community events near you." },
      { property: "og:title", content: "Explore events — Communa" },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includePast, setIncludePast] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    let qb = supabase
      .from("events")
      .select("*, hosts(name,slug)")
      .eq("state", "published")
      .eq("visibility", "public")
      .eq("hidden", false)
      .order("starts_at", { ascending: true });
    if (!includePast) qb = qb.gte("ends_at", new Date().toISOString());
    if (q) qb = qb.ilike("title", `%${q}%`);
    if (loc) qb = qb.or(`venue.ilike.%${loc}%,online_link.ilike.%${loc}%`);
    if (from) qb = qb.gte("starts_at", new Date(from).toISOString());
    if (to) qb = qb.lte("starts_at", new Date(to).toISOString());
    qb.limit(60).then(({ data }) => setEvents(data ?? []));
  }, [q, loc, from, to, includePast]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Explore events</h1>
      <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Search title…" value={q} onChange={(e) => setQ(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="Location" value={loc} onChange={(e) => setLoc(e.target.value)} />
        <input type="date" className="border rounded px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="border rounded px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm mb-6">
        <input type="checkbox" checked={includePast} onChange={(e) => setIncludePast(e.target.checked)} />
        Include past events
      </label>

      {events.length === 0 ? (
        <p className="text-muted-foreground">No events match those filters.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e) => (
            <Link key={e.id} to="/events/$id" params={{ id: e.id }} className="block border rounded-lg overflow-hidden hover:shadow-md transition bg-card">
              {e.cover_url && <img src={e.cover_url} alt={e.title} className="aspect-video object-cover w-full" />}
              <div className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDateTime(e.starts_at, e.timezone)}</span>
                  {isPast(e.ends_at) && <span className="px-2 py-0.5 rounded-full bg-muted text-foreground">Ended</span>}
                </div>
                <div className="font-semibold mt-1">{e.title}</div>
                <div className="text-sm text-muted-foreground mt-1">by {e.hosts?.name} · {e.venue || "Online"}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}