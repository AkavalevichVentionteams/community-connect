import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/host/$slug/invite")({
  component: InvitePage,
});

function InvitePage() {
  const { slug } = Route.useParams();
  const [host, setHost] = useState<any>(null);
  const [role, setRole] = useState<"host" | "checker">("checker");
  const [link, setLink] = useState("");

  useEffect(() => {
    supabase.from("hosts").select("*").eq("slug", slug).maybeSingle().then(({ data }) => setHost(data));
  }, [slug]);

  async function gen() {
    if (!host) return;
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("host_invites").insert({ host_id: host.id, token, role });
    if (error) return toast.error(error.message);
    setLink(`${window.location.origin}/invite/${token}`);
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
          <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied"); }} className="mt-2 text-sm underline">Copy</button>
        </div>
      )}
    </div>
  );
}