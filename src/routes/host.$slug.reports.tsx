import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HostRoleGate } from "@/components/HostRoleGate";

export const Route = createFileRoute("/host/$slug/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { slug } = Route.useParams();
  return (
    <HostRoleGate slug={slug} allow={["host"]} redirectPath={`/host/${slug}/reports`}>
      {({ host }) => <ReportsBody hostId={host.id} />}
    </HostRoleGate>
  );
}

function ReportsBody({ hostId }: { hostId: string }) {
  const [reports, setReports] = useState<any[]>([]);

  async function load() {
    // Scope reports to targets that belong to this host (events + photos of those events).
    const { data: ev } = await supabase.from("events").select("id").eq("host_id", hostId);
    const evIds = (ev ?? []).map((e) => e.id);
    const { data: ph } = evIds.length
      ? await supabase.from("gallery_photos").select("id").in("event_id", evIds)
      : { data: [] as { id: string }[] };
    const phIds = (ph ?? []).map((p) => p.id);
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("state", "open")
      .order("created_at", { ascending: false });
    const scoped = (data ?? []).filter((r: any) =>
      (r.target_type === "event" && evIds.includes(r.target_id)) ||
      (r.target_type === "photo" && phIds.includes(r.target_id))
    );
    setReports(scoped);
  }
  useEffect(() => { load(); }, [hostId]);

  async function hide(r: any) {
    if (r.target_type === "event") await supabase.from("events").update({ hidden: true }).eq("id", r.target_id);
    else await supabase.from("gallery_photos").update({ state: "hidden" }).eq("id", r.target_id);
    await supabase.from("reports").update({ state: "hidden" }).eq("id", r.id);
    toast.success("Hidden");
    load();
  }
  async function dismiss(r: any) {
    await supabase.from("reports").update({ state: "dismissed" }).eq("id", r.id);
    load();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Reports queue</h1>
      {!reports.length && <p className="text-muted-foreground">No open reports.</p>}
      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="border rounded p-4 bg-card">
            <div className="text-sm"><b>{r.target_type}</b> · {r.target_id}</div>
            {r.reason && <div className="text-sm text-muted-foreground mt-1">"{r.reason}"</div>}
            <div className="mt-2 flex gap-2">
              <button onClick={() => hide(r)} className="px-3 py-1 rounded bg-primary text-primary-foreground text-sm">Hide</button>
              <button onClick={() => dismiss(r)} className="px-3 py-1 rounded border text-sm">Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}