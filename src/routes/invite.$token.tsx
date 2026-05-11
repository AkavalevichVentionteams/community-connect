import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/$token")({
  component: AcceptInvite,
});

function AcceptInvite() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login", search: { redirect: `/invite/${token}` } }); return; }
    (async () => {
      const { data: inv } = await supabase.from("host_invites").select("*, hosts(slug)").eq("token", token).maybeSingle();
      if (!inv) { toast.error("Invalid invite"); nav({ to: "/" }); return; }
      await supabase.from("host_members").insert({ host_id: inv.host_id, user_id: user.id, role: inv.role });
      toast.success(`Joined as ${inv.role}`);
      nav({ to: "/host/$slug/dashboard", params: { slug: inv.hosts.slug } });
    })();
  }, [user, loading]);

  return <div className="p-8 text-center text-muted-foreground">Joining…</div>;
}