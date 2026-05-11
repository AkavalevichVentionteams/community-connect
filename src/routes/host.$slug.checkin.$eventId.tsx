import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HostRoleGate } from "@/components/HostRoleGate";

export const Route = createFileRoute("/host/$slug/checkin/$eventId")({
  component: CheckinPage,
});

function CheckinPage() {
  const { eventId, slug } = Route.useParams();
  return (
    <HostRoleGate
      slug={slug}
      allow={["host", "checker"]}
      redirectPath={`/host/${slug}/checkin/${eventId}`}
    >
      {() => <CheckinBody eventId={eventId} />}
    </HostRoleGate>
  );
}

function CheckinBody({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<any>(null);
  const [code, setCode] = useState("");
  const [counts, setCounts] = useState({ going: 0, checkedIn: 0 });
  const [lastRsvpId, setLastRsvpId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  async function load() {
    const { data: e } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
    setEvent(e);
    const { data: r } = await supabase.from("rsvps").select("status, checked_in_at").eq("event_id", eventId);
    setCounts({
      going: r?.filter((x) => x.status === "going").length ?? 0,
      checkedIn: r?.filter((x) => x.checked_in_at).length ?? 0,
    });
  }
  useEffect(() => { load(); }, [eventId]);

  async function checkIn(c?: string) {
    const trimmed = (c ?? code).trim();
    if (!trimmed) return;
    const { data: r } = await supabase.from("rsvps").select("*").eq("event_id", eventId).eq("ticket_code", trimmed).maybeSingle();
    if (!r) return toast.error("No matching ticket");
    if (r.status !== "going") return toast.error(`Ticket is ${r.status}`);
    if (r.checked_in_at) {
      toast.warning("Already checked in");
      return;
    }
    const { error } = await supabase.from("rsvps").update({ checked_in_at: new Date().toISOString() }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Checked in");
    setLastRsvpId(r.id);
    setHistory((h) => [trimmed, ...h].slice(0, 10));
    setCode("");
    load();
  }

  async function undo() {
    if (!lastRsvpId) return;
    await supabase.from("rsvps").update({ checked_in_at: null }).eq("id", lastRsvpId);
    setLastRsvpId(null);
    toast.success("Undone");
    load();
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">{event?.title}</h1>
      <p className="text-muted-foreground mb-6">Check-in</p>

      <div className="mb-4 p-4 rounded bg-card border">
        <div className="text-3xl font-bold">{counts.checkedIn} <span className="text-base text-muted-foreground">/ {counts.going} going</span></div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); checkIn(); }} className="flex gap-2 mb-4">
        <input className="flex-1 border rounded px-3 py-2 font-mono" placeholder="Ticket code" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
        <button className="px-4 py-2 rounded bg-primary text-primary-foreground">Check in</button>
      </form>

      {lastRsvpId && (
        <button onClick={undo} className="text-sm underline mb-4">Undo last scan</button>
      )}

      <div className="text-xs text-muted-foreground">
        <div className="font-semibold mb-1">Recent</div>
        {history.map((h, i) => <div key={i} className="font-mono">{h}</div>)}
      </div>
    </div>
  );
}