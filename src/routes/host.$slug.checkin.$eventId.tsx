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
  const [lastScan, setLastScan] = useState<{ rsvpId: string; checkInId: string } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

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

  // Live counters: refresh when any RSVP for this event changes (other checkers, undos, new RSVPs).
  useEffect(() => {
    const ch = supabase
      .channel(`checkin-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps", filter: `event_id=eq.${eventId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventId]);

  async function checkIn(c?: string) {
    if (busy) return;
    const trimmed = (c ?? code).trim();
    if (!trimmed) return;
    setBusy(true);
    const { data: r } = await supabase.from("rsvps").select("*").eq("event_id", eventId).eq("ticket_code", trimmed).maybeSingle();
    if (!r) { setBusy(false); return toast.error("No matching ticket"); }
    if (r.status !== "going") { setBusy(false); return toast.error(`Ticket is ${r.status}`); }
    if (r.checked_in_at) { setBusy(false); toast.warning("Already checked in"); return; }
    // Atomic check-in: only succeeds if not already checked in (prevents double-scan races).
    const now = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from("rsvps")
      .update({ checked_in_at: now })
      .eq("id", r.id)
      .is("checked_in_at", null)
      .select("id");
    if (error) { setBusy(false); return toast.error(error.message); }
    if (!updated || !updated.length) { setBusy(false); toast.warning("Already checked in"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    // Audit log; survives reload for Undo last scan.
    const { data: ci } = await supabase
      .from("check_ins")
      .insert({ rsvp_id: r.id, event_id: eventId, checker_id: user?.id, ticket_code: trimmed })
      .select("id")
      .maybeSingle();
    toast.success("Checked in");
    if (ci) setLastScan({ rsvpId: r.id, checkInId: ci.id });
    setHistory((h) => [trimmed, ...h].slice(0, 10));
    setCode("");
    setBusy(false);
    load();
  }

  async function undo() {
    if (!lastScan) {
      // Recover last scan from check_ins (e.g. after page reload).
      const { data } = await supabase
        .from("check_ins")
        .select("id, rsvp_id")
        .eq("event_id", eventId)
        .is("undone_at", null)
        .order("checked_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return toast.error("Nothing to undo");
      await supabase.from("rsvps").update({ checked_in_at: null }).eq("id", data.rsvp_id);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("check_ins").update({ undone_at: new Date().toISOString(), undone_by: user?.id }).eq("id", data.id);
      toast.success("Undone");
      load();
      return;
    }
    await supabase.from("rsvps").update({ checked_in_at: null }).eq("id", lastScan.rsvpId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("check_ins").update({ undone_at: new Date().toISOString(), undone_by: user?.id }).eq("id", lastScan.checkInId);
    setLastScan(null);
    toast.success("Undone");
    load();
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">{event?.title}</h1>
      <p className="text-muted-foreground mb-6">Check-in</p>

      <div className="mb-4 p-4 rounded bg-card border">
        <div className="text-3xl font-bold">
          {counts.checkedIn} <span className="text-base text-muted-foreground">/ {counts.going} going</span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {Math.max(0, counts.going - counts.checkedIn)} remaining
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); checkIn(); }} className="flex gap-2 mb-4">
        <input className="flex-1 border rounded px-3 py-2 font-mono" placeholder="Ticket code" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
        <button disabled={busy} className="px-4 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50">Check in</button>
      </form>

      <button onClick={undo} className="text-sm underline mb-4">Undo last scan</button>

      <div className="text-xs text-muted-foreground">
        <div className="font-semibold mb-1">Recent</div>
        {history.map((h, i) => <div key={i} className="font-mono">{h}</div>)}
      </div>
    </div>
  );
}