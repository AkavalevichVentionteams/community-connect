import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/event-utils";
import QRCode from "qrcode";

export const Route = createFileRoute("/tickets")({
  component: TicketsPage,
});

function TicketsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [qrs, setQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", search: { redirect: "/tickets" } });
  }, [user, loading]);

  async function loadTickets(uid: string) {
    const { data } = await supabase
      .from("rsvps")
      .select("*, events(*, hosts(name,slug))")
      .eq("user_id", uid)
      .in("status", ["going", "waitlist"])
      .order("created_at", { ascending: false });
    const upcoming = (data ?? []).filter((r: any) => new Date(r.events.ends_at) > new Date());
    setRows(upcoming);
    const codes: Record<string, string> = {};
    for (const r of upcoming) {
      codes[r.id] = await QRCode.toDataURL(r.ticket_code, { width: 200 });
    }
    setQrs(codes);
  }

  useEffect(() => {
    if (!user) return;
    loadTickets(user.id);
    // Realtime: reflect waitlist → going promotions immediately.
    const ch = supabase
      .channel(`my-rsvps-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps", filter: `user_id=eq.${user.id}` },
        () => loadTickets(user.id),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My tickets</h1>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No upcoming tickets. <Link to="/explore" className="underline">Find events</Link>.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="border rounded-lg p-4 flex gap-4 bg-card">
              {r.status === "going" && qrs[r.id] && <img src={qrs[r.id]} className="w-32 h-32" alt="" />}
              <div className="flex-1">
                <Link to="/events/$id" params={{ id: r.event_id }} className="font-semibold hover:underline">{r.events.title}</Link>
                <div className="text-sm text-muted-foreground">{formatDateTime(r.events.starts_at, r.events.timezone)}</div>
                <div className="text-xs mt-1">Status: <span className={r.status === "going" ? "text-primary" : ""}>{r.status}</span></div>
                {r.status === "going" && <div className="font-mono text-xs mt-2">{r.ticket_code}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}