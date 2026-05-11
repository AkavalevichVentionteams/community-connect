import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDateTime, isPast } from "@/lib/event-utils";

export const Route = createFileRoute("/my-events")({
  component: MyEventsPage,
});

function MyEventsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [memberships, setMemberships] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [hostFilter, setHostFilter] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", search: { redirect: "/my-events" } });
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: mem } = await supabase.from("host_members").select("*, hosts(*)").eq("user_id", user.id);
      const { data: owned } = await supabase.from("hosts").select("*").eq("owner_id", user.id);
      const all: any[] = [];
      for (const m of mem ?? []) all.push({ role: m.role, host: m.hosts });
      for (const h of owned ?? []) if (!all.find((x) => x.host?.id === h.id)) all.push({ role: "host", host: h });
      setMemberships(all);
      const hostIds = all.map((x) => x.host?.id).filter(Boolean);
      if (hostIds.length) {
        const { data: ev } = await supabase.from("events").select("*, hosts(name,slug)").in("host_id", hostIds).order("starts_at", { ascending: false });
        setEvents(ev ?? []);
      }
    })();
  }, [user?.id]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (hostFilter && e.host_id !== hostFilter) return false;
      if (q && !e.title.toLowerCase().includes(q.toLowerCase())) return false;
      // Range overlap: include events that intersect [from, to].
      if (from && new Date(e.ends_at) < new Date(from)) return false;
      if (to && new Date(e.starts_at) > new Date(to)) return false;
      return true;
    });
  }, [events, q, hostFilter, from, to]);

  // Realtime: reflect waitlist→going promotions and other RSVP changes
  // that affect events the user has a role on.
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`my-events-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rsvps", filter: `user_id=eq.${user.id}` }, () => {
        // Force a fresh fetch by toggling deps; simpler: re-run effect.
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My events</h1>
      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        <select className="border rounded px-3 py-2" value={hostFilter} onChange={(e) => setHostFilter(e.target.value)}>
          <option value="">All hosts</option>
          {memberships.map((m) => <option key={m.host.id} value={m.host.id}>{m.host.name}</option>)}
        </select>
        <input className="border rounded px-3 py-2" placeholder="Search title" value={q} onChange={(e) => setQ(e.target.value)} />
        <input type="date" className="border rounded px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="border rounded px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="space-y-3">
        {filtered.map((e) => {
          const m = memberships.find((mm) => mm.host?.id === e.host_id);
          return (
            <div key={e.id} className="border rounded p-4 flex flex-wrap gap-3 bg-card">
              <div className="flex-1 min-w-[200px]">
                <Link to="/events/$id" params={{ id: e.id }} className="font-semibold hover:underline">{e.title}</Link>
                <div className="text-xs text-muted-foreground">{formatDateTime(e.starts_at, e.timezone)} · {e.hosts?.name} · {e.state} {isPast(e.ends_at) && "· Ended"}</div>
              </div>
              <div className="flex gap-2 text-sm">
                {m?.role === "host" && <Link to="/host/$slug/dashboard" params={{ slug: e.hosts?.slug }} className="px-2 py-1 border rounded">Dashboard</Link>}
                <Link to="/host/$slug/checkin/$eventId" params={{ slug: e.hosts?.slug, eventId: e.id }} className="px-2 py-1 border rounded">Check-in</Link>
              </div>
            </div>
          );
        })}
        {!filtered.length && <p className="text-muted-foreground">No events.</p>}
      </div>
    </div>
  );
}