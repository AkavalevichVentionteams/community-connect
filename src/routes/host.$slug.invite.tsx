import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HostRoleGate } from "@/components/HostRoleGate";

export const Route = createFileRoute("/host/$slug/invite")({
  component: InvitePage,
});

function InvitePage() {
  const { slug } = Route.useParams();
  return (
    <HostRoleGate slug={slug} allow={["host"]} redirectPath={`/host/${slug}/invite`}>
      {({ host }) => <InviteForm hostId={host.id} />}
    </HostRoleGate>
  );
}

function InviteForm({ hostId }: { hostId: string }) {
  const [role, setRole] = useState<"host" | "checker">("checker");
  const [link, setLink] = useState("");
  const [invites, setInvites] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase
      .from("host_invites")
      .select("id, token, role, expires_at, revoked_at, created_at")
      .eq("host_id", hostId)
      .order("created_at", { ascending: false });
    setInvites(data ?? []);
  }
  useEffect(() => { load(); }, [hostId]);

  async function gen() {
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase
      .from("host_invites")
      .insert({ host_id: hostId, token, role });
    if (error) return toast.error(error.message);
    setLink(`${window.location.origin}/invite/${token}`);
    load();
  }

  async function revoke(id: string) {
    const { error } = await supabase
      .from("host_invites").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Invite revoked");
    load();
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Invite a member</h1>
      <div className="flex gap-2 items-center mb-4">
        <select className="border rounded px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as any)}>
          <option value="checker">Checker (check-in only)</option>
          <option value="host">Host (full access)</option>
        </select>
        <button onClick={gen} className="px-4 py-2 rounded bg-primary text-primary-foreground">Generate link</button>
      </div>
      {link && (
        <div className="border rounded p-3 bg-card">
          <div className="font-mono text-xs break-all">{link}</div>
          <div className="text-xs text-muted-foreground mt-1">Expires in 7 days.</div>
          <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied"); }} className="mt-2 text-sm underline">Copy</button>
        </div>
      )}

      <h2 className="text-lg font-semibold mt-8 mb-2">Active invites</h2>
      {invites.length === 0 && <p className="text-sm text-muted-foreground">No invites yet.</p>}
      <div className="space-y-2">
        {invites.map((inv) => {
          const expired = new Date(inv.expires_at) < new Date();
          const revoked = !!inv.revoked_at;
          return (
            <div key={inv.id} className="border rounded p-3 flex items-center gap-3 text-sm">
              <div className="flex-1">
                <div><b>{inv.role}</b> · {revoked ? "Revoked" : expired ? "Expired" : `Expires ${new Date(inv.expires_at).toLocaleString()}`}</div>
                <div className="font-mono text-xs break-all text-muted-foreground">/invite/{inv.token}</div>
              </div>
              {!revoked && !expired && (
                <>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`); toast.success("Copied"); }}
                    className="px-2 py-1 border rounded"
                  >Copy</button>
                  <button onClick={() => revoke(inv.id)} className="px-2 py-1 border rounded">Revoke</button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}