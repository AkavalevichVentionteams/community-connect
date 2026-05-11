import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type HostRole = "host" | "checker" | null;

export interface HostRoleState {
  loading: boolean;
  host: { id: string; slug: string; name: string; owner_id: string | null } | null;
  role: HostRole; // null = not a member
  isAuthed: boolean;
}

/**
 * Resolve the viewer's role for a host (by slug).
 * - returns role='host' if owner OR host_members.role='host'
 * - returns role='checker' if host_members.role='checker'
 * - returns role=null if signed in but no membership
 * - returns role=null + isAuthed=false if anonymous
 */
export function useHostRole(slug: string): HostRoleState {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<HostRoleState>({
    loading: true,
    host: null,
    role: null,
    isAuthed: false,
  });

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    (async () => {
      const { data: host } = await supabase
        .from("hosts")
        .select("id, slug, name, owner_id")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (!host) {
        setState({ loading: false, host: null, role: null, isAuthed: !!user });
        return;
      }
      if (!user) {
        setState({ loading: false, host, role: null, isAuthed: false });
        return;
      }
      if (host.owner_id === user.id) {
        setState({ loading: false, host, role: "host", isAuthed: true });
        return;
      }
      const { data: mem } = await supabase
        .from("host_members")
        .select("role")
        .eq("host_id", host.id)
        .eq("user_id", user.id)
        .maybeSingle();
      setState({
        loading: false,
        host,
        role: (mem?.role as HostRole) ?? null,
        isAuthed: true,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, user?.id, authLoading]);

  return state;
}