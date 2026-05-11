import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/event-utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Communa — Host free community events" },
      { name: "description", content: "Publish events, manage RSVPs, issue QR tickets, and check guests in at the door." },
      { property: "og:title", content: "Communa — Host free community events" },
      { property: "og:description", content: "Publish events, manage RSVPs, issue QR tickets, and check guests in at the door." },
    ],
  }),
  component: Index,
});

function Index() {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from("events")
      .select("*, hosts(name,slug)")
      .eq("state", "published")
      .eq("visibility", "public")
      .eq("hidden", false)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(6)
      .then(({ data }) => setEvents(data ?? []));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4">
      <section className="py-16 sm:py-24 text-center">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground">
          Run free community events <span className="text-primary">end&#8209;to&#8209;end.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Publish a page, share the link, collect RSVPs, hand out QR tickets,
          and check people in at the door — all in one lightweight tool.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link to="/explore" className="px-5 py-3 rounded-md bg-primary text-primary-foreground font-medium">
            Explore events
          </Link>
          <Link to="/host/new" className="px-5 py-3 rounded-md border font-medium">
            Become a host
          </Link>
        </div>
      </section>

      <section className="pb-20">
        <h2 className="text-2xl font-bold mb-6">Upcoming</h2>
        {events.length === 0 ? (
          <p className="text-muted-foreground">No upcoming events yet — be the first to publish one.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((e) => (
              <Link key={e.id} to="/events/$id" params={{ id: e.id }} className="block border rounded-lg overflow-hidden hover:shadow-md transition bg-card">
                {e.cover_url && <img src={e.cover_url} alt={e.title} className="aspect-video object-cover w-full" />}
                <div className="p-4">
                  <div className="text-xs text-muted-foreground">{formatDateTime(e.starts_at, e.timezone)}</div>
                  <div className="font-semibold mt-1">{e.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">by {e.hosts?.name}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
