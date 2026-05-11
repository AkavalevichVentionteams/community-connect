import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, isPast } from "@/lib/event-utils";

export const Route = createFileRoute("/hosts/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("hosts")
      .select("name,bio,logo_url,slug")
      .eq("slug", params.slug)
      .maybeSingle();
    return { host: data };
  },
  head: ({ loaderData }) => {
    const h: any = loaderData?.host;
    if (!h) return { meta: [{ title: "Host" }] };
    const title = `${h.name} — Host`;
    const desc = (h.bio ?? "").slice(0, 160) || `Events hosted by ${h.name}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: h.logo_url ? "summary_large_image" : "summary" },
    ];
    if (h.logo_url) {
      meta.push({ property: "og:image", content: h.logo_url });
      meta.push({ name: "twitter:image", content: h.logo_url });
    }
    return { meta };
  },
  component: HostPage,
});

function HostPage() {
  const { slug } = Route.useParams();
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: h } = await supabase.from("hosts").select("*").eq("slug", slug).maybeSingle();
      setHost(h);
      if (h) {
        const { data: ev } = await supabase.from("events")
          .select("*").eq("host_id", h.id).eq("state", "published").eq("visibility", "public").eq("hidden", false)
          .order("starts_at", { ascending: false });
        setEvents(ev ?? []);
      }
    })();
  }, [slug]);

  if (!host) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4">
        {host.logo_url && <img src={host.logo_url} alt="" className="w-20 h-20 rounded-full object-cover" />}
        <div>
          <h1 className="text-3xl font-bold">{host.name}</h1>
          <p className="text-muted-foreground text-sm">{host.contact_email}</p>
        </div>
      </div>
      {host.bio && <p className="mt-4 whitespace-pre-wrap">{host.bio}</p>}

      <h2 className="text-xl font-semibold mt-10 mb-4">Events</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {events.map((e) => (
          <Link key={e.id} to="/events/$id" params={{ id: e.id }} className="block border rounded-lg p-4 hover:shadow-md bg-card">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatDateTime(e.starts_at, e.timezone)}</span>
              {isPast(e.ends_at) && <span className="px-2 rounded-full bg-muted">Ended</span>}
            </div>
            <div className="font-semibold mt-1">{e.title}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
