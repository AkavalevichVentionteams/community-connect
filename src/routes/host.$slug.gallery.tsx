import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HostRoleGate } from "@/components/HostRoleGate";

export const Route = createFileRoute("/host/$slug/gallery")({
  component: GalleryReview,
});

function GalleryReview() {
  const { slug } = Route.useParams();
  return (
    <HostRoleGate slug={slug} allow={["host"]} redirectPath={`/host/${slug}/gallery`}>
      {({ host }) => <GalleryBody hostId={host.id} />}
    </HostRoleGate>
  );
}

function GalleryBody({ hostId }: { hostId: string }) {
  const [pending, setPending] = useState<any[]>([]);

  async function load() {
    const { data: ev } = await supabase.from("events").select("id").eq("host_id", hostId);
    const ids = (ev ?? []).map((x) => x.id);
    if (!ids.length) return setPending([]);
    const { data } = await supabase.from("gallery_photos").select("*").in("event_id", ids).eq("state", "pending");
    setPending(data ?? []);
  }
  useEffect(() => { load(); }, [hostId]);

  async function approve(id: string) {
    await supabase.from("gallery_photos").update({ state: "approved" }).eq("id", id);
    toast.success("Approved");
    load();
  }
  async function reject(id: string) {
    await supabase.from("gallery_photos").update({ state: "hidden" }).eq("id", id);
    load();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Gallery approval queue</h1>
      {!pending.length && <p className="text-muted-foreground">No pending photos.</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {pending.map((p) => (
          <div key={p.id} className="border rounded overflow-hidden bg-card">
            <img src={p.photo_url} className="aspect-square object-cover w-full" />
            <div className="p-2 flex gap-2">
              <button onClick={() => approve(p.id)} className="flex-1 px-2 py-1 rounded bg-primary text-primary-foreground text-sm">Approve</button>
              <button onClick={() => reject(p.id)} className="flex-1 px-2 py-1 rounded border text-sm">Hide</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}