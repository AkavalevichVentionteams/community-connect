import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "@tanstack/react-router";

const defaultEv: any = {
  title: "",
  description: "",
  starts_at: "",
  ends_at: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  venue: "",
  online_link: "",
  capacity: 50,
  cover_url: "",
  visibility: "public" as "public" | "unlisted",
  state: "draft" as "draft" | "published",
  is_paid: false,
};

export default function EventEditor({ slug, eventId, onSaved }: { slug: string; eventId?: string; onSaved?: (id: string) => void }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [hostId, setHostId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultEv);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("hosts").select("id").eq("slug", slug).maybeSingle().then(({ data }) => setHostId(data?.id ?? null));
  }, [slug]);

  useEffect(() => {
    if (!eventId) return;
    supabase.from("events").select("*").eq("id", eventId).maybeSingle().then(({ data }) => {
      if (data) setForm({
        ...defaultEv,
        ...data,
        starts_at: data.starts_at.slice(0, 16),
        ends_at: data.ends_at.slice(0, 16),
      });
    });
  }, [eventId]);

  async function uploadCover(f: File) {
    if (!user) return;
    const path = `covers/${user.id}-${Date.now()}-${f.name}`;
    const { error } = await supabase.storage.from("event-assets").upload(path, f);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("event-assets").getPublicUrl(path);
    setForm((s: any) => ({ ...s, cover_url: data.publicUrl }));
  }

  async function save(state?: "draft" | "published") {
    if (!hostId) return;
    const wantsPublish = (state ?? form.state) === "published";
    if (wantsPublish) {
      const hasVenue = (form.venue ?? "").trim().length > 0;
      const hasLink = (form.online_link ?? "").trim().length > 0;
      if (!hasVenue && !hasLink) {
        toast.error("Add a venue address or an online link before publishing");
        return;
      }
      if (!form.title.trim() || !form.starts_at || !form.ends_at) {
        toast.error("Title, start, and end are required to publish");
        return;
      }
    }
    setBusy(true);
    const payload: any = {
      ...form,
      host_id: hostId,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      capacity: Number(form.capacity),
      state: state ?? form.state,
      is_paid: false,
    };
    let id = eventId;
    if (eventId) {
      const { error } = await supabase.from("events").update(payload).eq("id", eventId);
      if (error) { setBusy(false); return toast.error(error.message); }
    } else {
      const { data, error } = await supabase.from("events").insert(payload).select().single();
      if (error) { setBusy(false); return toast.error(error.message); }
      id = data.id;
    }
    setBusy(false);
    toast.success("Saved");
    if (id && onSaved) onSaved(id);
    if (state) setForm((s: any) => ({ ...s, state }));
  }

  async function duplicate() {
    if (!eventId || !hostId) return;
    setBusy(true);
    const { data: src, error: e1 } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
    if (e1 || !src) { setBusy(false); return toast.error(e1?.message ?? "Not found"); }
    const copy: any = { ...src };
    delete copy.id; delete copy.created_at; delete copy.updated_at;
    copy.title = `${src.title} (copy)`;
    copy.state = "draft";
    copy.is_paid = false;
    const { data, error } = await supabase.from("events").insert(copy).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Duplicated as draft");
    nav({ to: "/host/$slug/events/$id/edit", params: { slug, id: data.id } });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
      <h1 className="text-2xl font-bold">{eventId ? "Edit event" : "New event"}</h1>
      <input className="w-full border rounded px-3 py-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea className="w-full border rounded px-3 py-2 min-h-32" placeholder="Description" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">Starts<input className="w-full border rounded px-3 py-2" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></label>
        <label className="text-sm">Ends<input className="w-full border rounded px-3 py-2" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></label>
      </div>
      <input className="w-full border rounded px-3 py-2" placeholder="Time zone (e.g. America/New_York)" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
      <input className="w-full border rounded px-3 py-2" placeholder="Venue address" value={form.venue ?? ""} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
      <input className="w-full border rounded px-3 py-2" placeholder="Online link (optional)" value={form.online_link ?? ""} onChange={(e) => setForm({ ...form, online_link: e.target.value })} />
      <label className="text-sm block">Capacity<input className="w-full border rounded px-3 py-2" type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></label>
      <label className="text-sm block">Cover image<input type="file" accept="image/*" onChange={(e) => e.target.files && uploadCover(e.target.files[0])} /></label>
      {form.cover_url && <img src={form.cover_url} className="rounded aspect-video object-cover" />}

      <div className="flex gap-4 items-center">
        <label className="text-sm flex items-center gap-2">
          <select className="border rounded px-2 py-1" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as any })}>
            <option value="public">Public (searchable)</option>
            <option value="unlisted">Unlisted (link-only)</option>
          </select>
        </label>
        <TooltipProvider>
          <div className="text-sm flex items-center gap-3 border rounded px-3 py-1.5">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pricing" checked readOnly />
              <span>Free</span>
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <label className="flex items-center gap-1.5 opacity-50 cursor-not-allowed">
                  <input type="radio" name="pricing" disabled />
                  <span>Paid</span>
                </label>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <div className="flex gap-2 pt-2">
        <button disabled={busy} onClick={() => save()} className="px-4 py-2 border rounded">Save draft</button>
        <button disabled={busy} onClick={() => save("published")} className="px-4 py-2 rounded bg-primary text-primary-foreground">Publish</button>
        {eventId && form.state === "published" && (
          <button disabled={busy} onClick={() => save("draft")} className="px-4 py-2 border rounded">Unpublish</button>
        )}
        {eventId && (
          <button disabled={busy} onClick={duplicate} className="px-4 py-2 border rounded">Duplicate</button>
        )}
      </div>
    </div>
  );
}